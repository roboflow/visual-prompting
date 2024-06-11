FROM tiangolo/uvicorn-gunicorn:python3.10-slim-2023-04-03
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY server.py .
EXPOSE 80
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "80"]