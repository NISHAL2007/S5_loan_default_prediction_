FROM python:3.10-slim

WORKDIR /app

# Copy root requirements and backend requirements
COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Copy source, data, models, and backend code
COPY src/ /app/src/
COPY models/ /app/models/
COPY data/ /app/data/
COPY backend/ /app/backend/

EXPOSE 8000

ENV PYTHONPATH=/app:/app/src

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
