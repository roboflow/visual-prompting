FROM tiangolo/uvicorn-gunicorn:python3.10-slim-2023-04-03
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN pip install scipy
COPY server.py .
COPY model ./model
EXPOSE 81
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "81"]