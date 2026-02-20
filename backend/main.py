# from fastapi import FastAPI, Depends
# from fastapi.middleware.cors import CORSMiddleware
# from sqlalchemy.orm import Session

# from database import get_db
# from models import Meal
# from schemas import MealOut
# from typing import List

# app = FastAPI()

# # Allow your RN app to call the API during dev
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # tighten later
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/health")
# def health():
#     return {"ok": True}

# @app.get("/meals", response_model=List[MealOut])
# def list_meals(db: Session = Depends(get_db)):
#     meals = db.query(Meal).order_by(Meal.ID.desc()).all()
#     return meals

from typing import List
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Meal
from schemas import MealOut

app = FastAPI()

@app.get("/meals", response_model=List[MealOut])
def get_meals(db: Session = Depends(get_db)):
    return db.query(Meal).all()