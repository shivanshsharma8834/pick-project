from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError # Import IntegrityError
import logging # Import logging
from . import models, schemas, auth

# Get a logger instance
logger = logging.getLogger(__name__)

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    # Log the attempt
    logger.info(f"Attempting to create user with email: {user.email}")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    
    try:
        db.commit()
        logger.info(f"Successfully committed user: {user.email}")
        db.refresh(db_user)
    except IntegrityError as e:
        # This is a more specific catch for database integrity issues
        # (like UNIQUE constraints if our first check failed somehow)
        db.rollback()
        logger.error(f"IntegrityError creating user {user.email}: {e}")
        # We re-raise it so the generic handler or a specific one can catch it
        raise
    except Exception as e:
        # Catch any other exception during commit
        db.rollback() # Rollback the transaction on failure
        logger.error(f"Exception during DB commit for user {user.email}: {e}")
        # Re-raise the exception to be handled by the global handler
        raise

    return db_user