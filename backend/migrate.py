"""
Database initialization and migration script
"""
from sqlalchemy import create_engine
from app.core.config import settings
from app.models.database import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_database():
    """Create all database tables"""
    try:
        engine = create_engine(settings.database_url)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully!")
        
        return True
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        return False


def drop_database():
    """Drop all database tables (use with caution!)"""
    try:
        engine = create_engine(settings.database_url)
        
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully!")
        
        return True
    except Exception as e:
        logger.error(f"Error dropping database tables: {e}")
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "create":
            create_database()
        elif command == "drop":
            confirm = input("Are you sure you want to drop all tables? (yes/no): ")
            if confirm.lower() == "yes":
                drop_database()
            else:
                print("Operation cancelled.")
        else:
            print("Usage: python migrate.py [create|drop]")
    else:
        print("Usage: python migrate.py [create|drop]")
