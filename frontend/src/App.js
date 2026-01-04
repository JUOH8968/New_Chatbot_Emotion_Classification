import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User, ChevronDown, ChevronRight } from 'lucide-react';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '안녕하세요! 배달 어플 리뷰를 입력하시면 긍정인지 부정인지 분류해 드립니다. 모호한 내용은 포함하지 마시고 한 문장으로 입력해주세요.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGoodEx, setShowGoodEx] = useState(false);
  const [showBadEx, setShowBadEx] = useState(false);
  const scrollRef = useRef();

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try { 
      const response = await axios.post('https://new-chatbot-emotion-classification.onrender.com/analyze', {
        content: input,
      });

      const result = response.data;
      // 숫자가 없을 경우를 대비해 0 처리 및 소수점 2자리 고정
      const confidencePercent = (Number(result.confidence || 0) * 100).toFixed(2);

      const botMsg = {
        role: 'assistant',
        // 💡 중요: split('**')이 정확히 작동하도록 형식을 유지합니다.
        content: `분석 결과 : **${result.sentiment}** 리뷰일 확률이 ${confidencePercent}%입니다.`,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ 서버 연결에 실패했습니다. FastAPI 서버 상태를 확인하세요.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 상단 상태 바 */}
      <div style={styles.topBanner}>감정 분류 모델 로드 완료!</div>

      <div style={styles.mainContent}>
        <header style={styles.header}>
          <h1 style={styles.title}>배달 어플 리뷰 감정 분류 봇 🤖</h1>
          <p style={styles.subtitle}>파인튜닝된 KLUE/RoBERTa 모델로 리뷰를 긍정/부정 분류합니다.</p>
        </header>

        {/* 아코디언 메뉴 */}
        <div style={styles.accordionContainer}>
          <div style={styles.accordion} onClick={() => setShowGoodEx(!showGoodEx)}>
            {showGoodEx ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>좋은 예시 리뷰 보기</span>
          </div>
          {showGoodEx && <div style={styles.accordionContent}>"음식이 정말 맛있고 배달도 빨랐어요! 추천합니다."</div>}

          <div style={styles.accordion} onClick={() => setShowBadEx(!showBadEx)}>
            {showBadEx ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>잘못된 예시 리뷰 보기</span>
          </div>
          {showBadEx && <div style={styles.accordionContent}>"그냥 그래요. (모호한 표현 지양)"</div>}
        </div>

        {/* 채팅 내역 */}
        <div style={styles.chatWindow} ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} style={msg.role === 'user' ? styles.userRow : styles.botRow}>
              <div style={styles.iconWrapper}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} color="#ff9800" />}
              </div>

              <div style={msg.role === 'user' ? styles.userBubble : styles.botBubble}>
                {msg.content.includes('**') ? (
                  <span>
                    {/* 1. "분석 결과 : " */}
                    {msg.content.split('**')[0]}
                    
                    {/* 2. "긍정" 또는 "부정" (강조) */}
                    <strong style={{ color: msg.content.includes('긍정') ? '#4caf50' : '#f44336' }}>
                      {msg.content.split('**')[1]}
                    </strong>
                    
                    {/* 3. " 리뷰일 확률이 95.00%입니다." (숫자 포함) */}
                    {msg.content.split('**')[2]}
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={styles.botRow}>
              <div style={styles.iconWrapper}><Bot size={20} color="#ff9800" /></div>
              <div style={styles.botBubble}>분석 중...</div>
            </div>
          )}
        </div>
      </div>

      {/* 입력창 */}
      <div style={styles.inputContainer}>
        <div style={styles.inputWrapper}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="리뷰 내용을 여기에 입력하세요."
          />
          <button style={styles.sendButton} onClick={handleSend} disabled={isLoading}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1b1e', color: '#e8eaed', fontFamily: 'sans-serif' },
  topBanner: { backgroundColor: '#143321', color: '#4caf50', padding: '10px 20px', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #2e2f33' },
  mainContent: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '0 20px' },
  header: { marginTop: '40px', marginBottom: '20px' },
  title: { fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' },
  subtitle: { color: '#9aa0a6', fontSize: '16px' },
  accordionContainer: { marginBottom: '30px' },
  accordion: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #3c4043', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', backgroundColor: '#202124' },
  accordionContent: { padding: '10px 40px', color: '#9aa0a6', fontSize: '14px' },
  chatWindow: { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' },
  botRow: { display: 'flex', flexDirection: 'row', gap: '15px', alignItems: 'flex-start', justifyContent: 'flex-start' },
  userRow: { display: 'flex', flexDirection: 'row-reverse', gap: '15px', alignItems: 'flex-start', justifyContent: 'flex-start' },
  iconWrapper: { minWidth: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#3c4043', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  botBubble: { maxWidth: '70%', padding: '15px', borderRadius: '12px', backgroundColor: '#2d2e32', border: '1px solid #3c4043', fontSize: '16px', lineHeight: '1.6' },
  userBubble: { maxWidth: '70%', padding: '15px', borderRadius: '12px', backgroundColor: '#0b93f6', color: 'white', fontSize: '16px', lineHeight: '1.6' },
  inputContainer: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(transparent, #1a1b1e 30%)', display: 'flex', justifyContent: 'center' },
  inputWrapper: { width: '100%', maxWidth: '800px', position: 'relative', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: '16px 50px 16px 20px', borderRadius: '12px', border: '1px solid #3c4043', backgroundColor: '#2d2e32', color: 'white', fontSize: '16px', outline: 'none' },
  sendButton: { position: 'absolute', right: '15px', background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer' },
};

export default App;