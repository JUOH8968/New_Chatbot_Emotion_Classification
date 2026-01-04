####### 3.12.12, 가상환경 dl
import os
import oracledb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from dotenv import load_dotenv

import os
# Intel OpenMP 라이브러리 중복 로드 허용 (많은 DLL 로드 에러를 해결해줍니다)
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"


# .env 파일 로드 (파일이 camp 폴더 안에 있다면 아래처럼 경로를 명시해주는 것이 안전합니다)
load_dotenv()

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    ##### 웹 배포시 실제 사이트 주소를 변경하기
#     origins = [
#     "http://localhost:3000",    # 로컬 테스트용
#     "https://여러분의-리액트-사이트.vercel.app", # 배포 후 실제 사이트 주소
# ]
 
    allow_origins=["http://localhost:3000","https://new-chatbot-emotion-classification-4emoa5t9o.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 로드 (변수명이 .env와 일치하는지 확인!)
MODEL_PATH = os.getenv("MODEL_PATH", "ju03/Chatbot_Emotion-classification")
classifier = pipeline("text-classification", model=MODEL_PATH, tokenizer=MODEL_PATH)

def get_db_connection():
    # .env에서 값을 가져오되, 없으면 기본값을 사용하도록 설정
    user = os.getenv("user")
    password = os.getenv("password")
    host = os.getenv("host")
    port_str = os.getenv("port")
    sid = os.getenv("sid")

    # 포트값이 None인지 체크하여 에러 방지
    if not port_str:
        print("❌ 에러: .env 파일에서 DB_PORT를 찾을 수 없습니다.")
        return None

    try:
        return oracledb.connect(
            user=user,
            password=password,
            host=host,
            port=int(port_str),  # 여기서 에러가 났던 부분입니다
            sid=sid              # 쉼표가 빠졌는지 확인하세요
        )
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        return None

# (이하 ReviewRequest 및 analyze_review 함수 로직은 동일)

# 데이터 모델
class ReviewRequest(BaseModel):
    content: str

# --- API 엔드포인트 ---
# 1로 라벨링한것이 긍정, 0으로 라벨링한것이 부정
@app.post("/analyze")
async def analyze_review(request: ReviewRequest):
    # 1. 감성 분석
    try:
        result = classifier(request.content)[0]
        actual_label = result['label']  # 모델이 실제로 내뱉는 값 (예: 'positive', 'negative' 등)
        if actual_label.upper() in ['LABEL_1', 'POSITIVE']:
            sentiment = "긍정"
            confidence = float(result['score']) # 점수를 float형으로 변환 
        else:
            sentiment = "부정"
            confidence = float(result['score']) # 점수를 float형으로 변환 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 분석 오류: {e}")

    # 2. DB 저장
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            sql = "INSERT INTO BOT_REVIEW_LOG (LOG_ID, USER_QUERY, CLASSIFICATION) VALUES (BOT_REVIEW_LOG_SEQ.NEXTVAL, :1, :2)"
            cursor.execute(sql, [request.content, sentiment])
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"⚠️ DB 저장 실패: {e}")
   
    return {
        "sentiment": sentiment,
        "confidence": float(confidence),
        "content": request.content
    }
   
   
@app.get("/")
def home():
    return {"message": "감성 분석 서버가 실행 중입니다!"}

