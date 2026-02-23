import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from datetime import datetime
import sys
import json
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class TrafficPredictor:
    def __init__(self):
        self.model_duration = None
        self.model_congestion = None
        self.model_speed = None
        self.route_mapping = {}
        self._initialize_route_mapping()
        
    def _initialize_route_mapping(self):
        """Mapear nombres de rutas a números"""
        routes = [
            "Carrera 33", "Carrera 27", "Carrera 21", "Carrera 17",
            "Carrera 15", "Centro", "Quebrada Seca", "Norte",
            "Provenza", "Av. Florida Blanca", "Mitis", "Real de Minas"
        ]
        
        for idx, route in enumerate(routes):
            self.route_mapping[f"{route} (ida)"] = idx * 2
            self.route_mapping[f"{route} (vuelta)"] = idx * 2 + 1
    
    def fetch_data_from_db(self, days_back=7):
        """Obtener datos de la base de datos MySQL"""
        try:
            connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                database=os.getenv('DB_NAME', 'trafficbga'),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', '')
            )
            
            if connection.is_connected():
                query = f"""
                    SELECT 
                        routeName,
                        originLat,
                        originLng,
                        destLat,
                        destLng,
                        durationNormal,
                        durationTraffic,
                        avgSpeed,
                        congestionIndex,
                        timestamp,
                        distanceMeters
                    FROM traffic_route_data
                    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL {days_back} DAY)
                    ORDER BY timestamp ASC
                """
                
                df = pd.read_sql(query, connection)
                connection.close()
                
                print(f"✅ Datos obtenidos: {len(df)} registros")
                return df
                
        except Error as e:
            print(f"❌ Error conectando a MySQL: {e}")
            return None
    
    def preprocess_data(self, df):
        """Preprocesar datos para el modelo"""
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Extraer características temporales
        df['hour'] = df['timestamp'].dt.hour
        df['dayOfWeek'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        df['isWeekend'] = (df['dayOfWeek'] >= 5).astype(int)
        df['isRushHour'] = df['hour'].apply(
            lambda x: 1 if (7 <= x <= 9) or (17 <= x <= 19) else 0
        )
        
        # Mapear rutas
        df['routeId'] = df['routeName'].map(self.route_mapping)
        
        # Eliminar filas con valores nulos
        df = df.dropna(subset=['routeId', 'durationNormal', 'durationTraffic', 
                               'avgSpeed', 'congestionIndex'])
        
        return df
    
    def create_features(self, df):
        """Crear matriz de features"""
        features = [
            'routeId', 'hour', 'dayOfWeek', 'month', 
            'isWeekend', 'isRushHour', 'durationNormal', 'distanceMeters'
        ]
        
        X = df[features].values
        
        y_duration = df['durationTraffic'].values
        y_congestion = df['congestionIndex'].values
        y_speed = df['avgSpeed'].values
        
        return X, y_duration, y_congestion, y_speed, features
    
    def train(self, days_back=7, test_size=0.2):
        """Entrenar los modelos"""
        print("🚀 Iniciando entrenamiento de modelos Random Forest...")
        
        # Obtener datos
        df = self.fetch_data_from_db(days_back)
        
        if df is None or len(df) < 50:
            raise ValueError(f"Datos insuficientes. Se necesitan al menos 50 registros.")
        
        # Preprocesar
        df = self.preprocess_data(df)
        print(f"📊 Datos preprocesados: {len(df)} registros")
        
        # Crear features
        X, y_duration, y_congestion, y_speed, feature_names = self.create_features(df)
        
        # Split train/test
        X_train, X_test, y_dur_train, y_dur_test = train_test_split(
            X, y_duration, test_size=test_size, random_state=42
        )
        _, _, y_cong_train, y_cong_test = train_test_split(
            X, y_congestion, test_size=test_size, random_state=42
        )
        _, _, y_speed_train, y_speed_test = train_test_split(
            X, y_speed, test_size=test_size, random_state=42
        )
        
        print(f"📈 Datos de entrenamiento: {len(X_train)}")
        print(f"📉 Datos de prueba: {len(X_test)}\n")
        
        # Entrenar modelo de duración
        print("1️⃣ Entrenando modelo de duración...")
        self.model_duration = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.model_duration.fit(X_train, y_dur_train)
        y_dur_pred = self.model_duration.predict(X_test)
        
        mae_dur = mean_absolute_error(y_dur_test, y_dur_pred)
        rmse_dur = np.sqrt(mean_squared_error(y_dur_test, y_dur_pred))
        r2_dur = r2_score(y_dur_test, y_dur_pred)
        
        print(f"   MAE: {mae_dur:.2f} segundos")
        print(f"   RMSE: {rmse_dur:.2f} segundos")
        print(f"   R²: {r2_dur:.4f}\n")
        
        # Entrenar modelo de congestión
        print("2️⃣ Entrenando modelo de congestión...")
        self.model_congestion = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.model_congestion.fit(X_train, y_cong_train)
        y_cong_pred = self.model_congestion.predict(X_test)
        
        mae_cong = mean_absolute_error(y_cong_test, y_cong_pred)
        rmse_cong = np.sqrt(mean_squared_error(y_cong_test, y_cong_pred))
        r2_cong = r2_score(y_cong_test, y_cong_pred)
        
        print(f"   MAE: {mae_cong:.2f}%")
        print(f"   RMSE: {rmse_cong:.2f}%")
        print(f"   R²: {r2_cong:.4f}\n")
        
        # Entrenar modelo de velocidad
        print("3️⃣ Entrenando modelo de velocidad...")
        self.model_speed = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.model_speed.fit(X_train, y_speed_train)
        y_speed_pred = self.model_speed.predict(X_test)
        
        mae_speed = mean_absolute_error(y_speed_test, y_speed_pred)
        rmse_speed = np.sqrt(mean_squared_error(y_speed_test, y_speed_pred))
        r2_speed = r2_score(y_speed_test, y_speed_pred)
        
        print(f"   MAE: {mae_speed:.2f} km/h")
        print(f"   RMSE: {rmse_speed:.2f} km/h")
        print(f"   R²: {r2_speed:.4f}\n")
        
        # Guardar modelos
        self.save_models()
        
        # Importancia de features
        print("📊 Importancia de características (Duración):")
        importances = self.model_duration.feature_importances_
        for name, importance in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True):
            print(f"   {name}: {importance:.4f}")
        
        results = {
            "datasetSize": len(df),
            "trainSize": len(X_train),
            "testSize": len(X_test),
            "durationMetrics": {
                "mae": float(mae_dur),
                "rmse": float(rmse_dur),
                "r2": float(r2_dur)
            },
            "congestionMetrics": {
                "mae": float(mae_cong),
                "rmse": float(rmse_cong),
                "r2": float(r2_cong)
            },
            "speedMetrics": {
                "mae": float(mae_speed),
                "rmse": float(rmse_speed),
                "r2": float(r2_speed)
            },
            "featureImportance": {
                name: float(imp) 
                for name, imp in zip(feature_names, importances)
            }
        }
        
        print("\n✅ Entrenamiento completado")
        return results
    
    def save_models(self):
        """Guardar modelos"""
        os.makedirs('models', exist_ok=True)
        
        joblib.dump(self.model_duration, 'models/duration_model.pkl')
        joblib.dump(self.model_congestion, 'models/congestion_model.pkl')
        joblib.dump(self.model_speed, 'models/speed_model.pkl')
        joblib.dump(self.route_mapping, 'models/route_mapping.pkl')
        
        print("💾 Modelos guardados en ./models/")
    
    def load_models(self):
        """Cargar modelos"""
        self.model_duration = joblib.load('models/duration_model.pkl')
        self.model_congestion = joblib.load('models/congestion_model.pkl')
        self.model_speed = joblib.load('models/speed_model.pkl')
        self.route_mapping = joblib.load('models/route_mapping.pkl')
        
        print("✅ Modelos cargados")
    
    def predict(self, route_name, hour, day_of_week, month, is_weekend, 
                duration_normal, distance_meters):
        """Hacer predicción"""
        if self.model_duration is None:
            self.load_models()
        
        route_id = self.route_mapping.get(route_name, 0)
        is_rush_hour = 1 if (7 <= hour <= 9) or (17 <= hour <= 19) else 0
        
        features = np.array([[
            route_id, hour, day_of_week, month,
            1 if is_weekend else 0, is_rush_hour,
            duration_normal, distance_meters
        ]])
        
        pred_duration = self.model_duration.predict(features)[0]
        pred_congestion = self.model_congestion.predict(features)[0]
        pred_speed = self.model_speed.predict(features)[0]
        
        return {
            "predictedDurationTraffic": int(pred_duration),
            "predictedCongestionIndex": round(float(pred_congestion), 2),
            "predictedAvgSpeed": round(float(pred_speed), 2)
        }

if __name__ == "__main__":
    predictor = TrafficPredictor()
    
    try:
        results = predictor.train(days_back=7)
        print("\n" + "="*60)
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)