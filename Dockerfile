FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 8080

CMD ["python", "backend/main.py"]
