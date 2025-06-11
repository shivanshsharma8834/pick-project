from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging # Import logging

# Correctly import from the 'app' package
from app import recommender, crud, models, schemas, auth, database
from app.data_loader import load_products, load_users as load_users_from_json

# --- Setup ---
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Personalized Recommendation Agent")

# --- NEW: Global Exception Handler ---
# This is the key backend fix. It catches any error that isn't
# an HTTPException and formats it as a JSON response.
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"An unhandled exception occurred: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )

# --- Mount Static Files ---
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse('static/index.html')


# --- Authentication Endpoints ---
@app.post("/api/auth/register", response_model=schemas.User, tags=["Authentication"])
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    # This is a common source of errors. If the email already exists,
    # the database might throw a UNIQUE constraint error. We handle it gracefully.
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        # This is a predictable error, so we raise an HTTPException
        # which FastAPI automatically converts to a clean JSON error.
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Any other unexpected error during user creation will now be caught
    # by our new generic_exception_handler.
    return crud.create_user(db=db, user=user)

# (The rest of your main.py file remains the same)
@app.post("/api/auth/login", response_model=schemas.Token, tags=["Authentication"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Protected Endpoints ---
@app.get("/api/me", response_model=schemas.User, tags=["Users"])
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/api/me/recommendations", tags=["Recommendations"])
async def get_my_recommendations(current_user: models.User = Depends(auth.get_current_user)):
    user_dict_for_recommender = schemas.User.from_attributes(current_user).model_dump()
    original_load_users = recommender.load_users
    recommender.load_users = lambda: [user_dict_for_recommender]
    results = recommender.get_recommendations(current_user.id)
    recommender.load_users = original_load_users
    return results

# --- Demo Mode Endpoints ---
@app.get("/api/users", tags=["Demo Mode"])
async def get_demo_users():
    return load_users_from_json()

@app.get("/api/recommendations/{user_id}", tags=["Demo Mode"])
async def get_demo_user_recommendations(user_id: int):
    return recommender.get_recommendations(user_id)

@app.get("/api/products", tags=["Products"])
async def get_all_products():
    return load_products()