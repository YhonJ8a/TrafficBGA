from flask import Flask, request, jsonify
from flask_cors import CORS
from train_model import TrafficPredictor
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

predictor = TrafficPredictor()

# Intentar cargar modelos al iniciar
try:
    predictor.load_models()
    print("✅ Modelos cargados al iniciar el servidor")
except:
    print("⚠️ No se encontraron modelos. Entrene primero.")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "ML Traffic Prediction"})

@app.route('/train', methods=['POST'])
def train():
    try:
        data = request.get_json() or {}
        days_back = data.get('daysBack', 7)
        test_size = data.get('testSize', 0.2)
        
        results = predictor.train(days_back=days_back, test_size=test_size)
        
        return jsonify({
            "success": True,
            "message": "Modelo entrenado exitosamente",
            "results": results
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        route_name = data.get('routeName')
        datetime_str = data.get('datetime', datetime.now().isoformat())
        duration_normal = data.get('durationNormal', 300)
        distance_meters = data.get('distanceMeters', 1500)
        
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        
        prediction = predictor.predict(
            route_name=route_name,
            hour=dt.hour,
            day_of_week=dt.weekday(),
            month=dt.month - 1,
            is_weekend=(dt.weekday() >= 5),
            duration_normal=duration_normal,
            distance_meters=distance_meters
        )
        
        return jsonify({
            "success": True,
            "routeName": route_name,
            "datetime": datetime_str,
            "durationNormal": duration_normal,
            "distanceMeters": distance_meters,
            **prediction
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    try:
        data = request.get_json()
        predictions_input = data.get('predictions', [])
        
        results = []
        for pred_input in predictions_input:
            route_name = pred_input.get('routeName')
            datetime_str = pred_input.get('datetime', datetime.now().isoformat())
            duration_normal = pred_input.get('durationNormal', 300)
            distance_meters = pred_input.get('distanceMeters', 1500)
            
            dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
            
            prediction = predictor.predict(
                route_name=route_name,
                hour=dt.hour,
                day_of_week=dt.weekday(),
                month=dt.month - 1,
                is_weekend=(dt.weekday() >= 5),
                duration_normal=duration_normal,
                distance_meters=distance_meters
            )
            
            results.append({
                "routeName": route_name,
                "datetime": datetime_str,
                "durationNormal": duration_normal,
                "distanceMeters": distance_meters,
                **prediction
            })
        
        return jsonify({
            "success": True,
            "predictions": results
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('ML_SERVICE_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)