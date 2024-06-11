To Build & Run: `docker build . -t visual && docker run -p 80:80 visual:latest`

How to make a `/train` call: `curl -X POST "http://localhost:80/train" -H "Content-Type: application/json" -d @train_test.json`

How to make a `/infer` call: `curl -X POST "http://localhost:80/infer" -H "Content-Type: application/json" -d @infer_test.json`