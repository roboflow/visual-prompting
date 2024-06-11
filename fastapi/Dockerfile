FROM tiangolo/uvicorn-gunicorn:python3.10-slim-2023-04-03
COPY server.py .
COPY requirements.txt .
EXPOSE 8000
RUN pip install -r requirements.txt
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]