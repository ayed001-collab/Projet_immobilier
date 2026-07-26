FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Le GeoJSON de service est monté en volume (produit par la Data Factory).
ENV GOLD_GEOJSON=/data/gold/communes_prix_m2.geojson
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
