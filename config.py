from dotenv import load_dotenv
import os

def load_config():
    """Loads configuration variables from environment variables."""
    load_dotenv()
    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        raise ValueError("BOT_TOKEN environment variable not set.")
    return bot_token

BOT_TOKEN = load_config()

if __name__ == '__main__':
    print("Configuration loaded successfully.")
    # Example usage:
    # print(f"Bot Token: {BOT_TOKEN[:5]}...")
