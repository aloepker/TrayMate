from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://traymate_db:ByteOfCare1234!@traymate.cviogkqac77e.us-east-2.rds.amazonaws.com:3306/mealMenu"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Connected! Result:", result.scalar())
except Exception as e:
    print("❌ Connection failed:")
    print(e)