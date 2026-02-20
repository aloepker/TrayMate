from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.sql import func
from database import Base

class Meal(Base):
    # table name from database mealMenu
    __tablename__ = "meals"   

    id = Column("ID", Integer, primary_key=True, index=True)
    name = Column(String(225), nullable=False)
    ingredients = Column(String(1000), nullable=False)
    nutri_info = Column(String(1000), nullable=False)
    nutri_amounts = Column(String(45), nullable=False)
    description = Column(String(1000), nullable=False)
    image_url = Column(String(225), nullable=False)
    mealtype = Column(String(5), nullable=False)
    mealPeriod = Column(String(45), nullable=False)
    time_range = Column(String(45), nullable=False)
    allergen_info = Column(Text, nullable=False)
    tags = Column(Text, nullable=False)
    isAvailable = Column(Boolean, nullable=False)
    isSeasonal = Column(Boolean, nullable=False)
