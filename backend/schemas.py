# from pydantic import BaseModel, ConfigDict
# from typing import Optional

# class MealOut(BaseModel):
#     model_config = ConfigDict(from_attributes=True)

#     ID: int
#     name: str
#     ingredients: str
#     nutri_info: str
#     nutri_amounts: str
#     description: str
#     image_url: str
#     mealtype: str
#     mealPeriod: str
#     time_range: str
#     allergen_info: str
#     tags: str
#     # is_available: int
#     # is_seasonal: int

#     class Config:
#         from_attributes = True  # Pydantic v2
from pydantic import BaseModel, ConfigDict

class MealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    ingredients: str
    nutri_info: str
    nutri_amounts: str
    description: str
    image_url: str
    mealtype: str
    mealPeriod: str
    time_range: str
    allergen_info: str
    tags: str
    isAvailable: bool
    isSeasonal: bool