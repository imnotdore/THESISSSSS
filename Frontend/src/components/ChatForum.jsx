import { useState, useEffect, useRef } from 'react';
import { 
  getClassChatMessages
} from '../lib/api';
import io from 'socket.io-client';
import './ChatForum.css';

export default function ChatForum({ classId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const getInitials = (name = "") => {
    const parts = name.trim().split(" ");
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await getClassChatMessages(classId);
      if (response.success) {
        setMessages(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      if (socketRef.current) {
        socketRef.current.emit("send-chat-message", {
          classId,
          message: newMessage.trim()
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      if (socketRef.current) {
        socketRef.current.emit("delete-chat-message", {
          messageId,
          classId
        });
      }
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  const handleAddReply = async (messageId) => {
    if (!replyText.trim()) return;

    try {
      if (socketRef.current) {
        socketRef.current.emit("add-chat-reply", {
          messageId,
          classId,
          replyMessage: replyText.trim()
        });

        setReplyText('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  const handleTypingStart = () => {
    if (socketRef.current) {
      socketRef.current.emit("typing-start", { classId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop();
      }, 3000);
    }
  };

  const handleTypingStop = () => {
    if (socketRef.current) {
      socketRef.current.emit("typing-stop", { classId });
    }
  };

  useEffect(() => {
    if (!classId || !currentUser) return;

    const socket = io("http://localhost:3000", {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join-class-chat', { classId });
    });

    socket.on('chat-history', (history) => {
      setMessages(history);
    });

    socket.on('new-chat-message', (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    socket.on('message-deleted', (data) => {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    });

    socket.on('reply-added', (data) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, replies: [...(msg.replies || []), data.reply] }
            : msg
        )
      );
    });

    socket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userName !== data.userName);
        return data.isTyping ? [...filtered, data] : filtered;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave-class-chat', { classId });
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [classId, currentUser]);

  useEffect(() => {
    if (classId) loadMessages();
  }, [classId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const canDeleteMessage = (msg) =>
    currentUser?.id === msg.userId?._id || currentUser?.role === 'teacher';

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className="chat-wrapper">

      <div className="messages-area">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          messages.map((msg) => {
            const isOwn = currentUser?.id === msg.userId?._id;
            const avatar = msg.userId?.avatar;
            const initials = getInitials(msg.userName);

            return (
              <div key={msg._id} className={`msg-row ${isOwn ? "own" : "other"}`}>
                
                {!isOwn && (
                  <div className="avatar">
                    {avatar ? (
                      <img src={avatar} alt="avatar" />
                    ) : (
                      <div className="initials">{initials}</div>
                    )}
                  </div>
                )}

                <div className={`bubble ${isOwn ? "blue" : "grey"}`}>
                  <div className="bubble-text">{msg.message}</div>
                  <div className="bubble-time">{formatTime(msg.createdAt)}</div>
                </div>

                {isOwn && (
                  <div className="avatar">
                    {avatar ? (
                      <img src={avatar} alt="avatar" />
                    ) : (
                      <div className="initials">{initials}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="typing-row">
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
            <div className="typing-name">
              {typingUsers.map(u => u.userName).join(", ")} typing…
            </div>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      <form onSubmit={handleSendMessage} className="input-area">
        <input 
          type="text"
          placeholder="Message…"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTypingStart();
          }}
          className="chat-input"
        />
        <button className="send-btn" disabled={!newMessage.trim()}>
          Send
        </button>
      </form>

    </div>
  );
}
