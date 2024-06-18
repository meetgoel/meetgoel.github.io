import re
import subprocess
import eel
import datetime
import os
import webbrowser
import pywhatkit as kit
from engine.command import speak, takeCommand
from engine.config import ASSISTANT_NAME
from hugchat import hugchat

@eel.expose
def playAssistantSound():
    music_dir = "/Users/meetgoel/Desktop/Meet Project/Jarvis/www/assets/audio/startup.mp3"
    try:
        subprocess.run(['afplay', music_dir])
    except Exception as e:
        print(f"An error occurred: {e}")

def chatBot(query):
    user_input = query.lower()
    chatbot = hugchat.ChatBot(cookie_path="/Users/meetgoel/Desktop/Meet Project/Jarvis/engine/cookies.json")
    id = chatbot.new_conversation()
    chatbot.change_conversation(id)
    response =  chatbot.chat(user_input)
    print(response)
    speak(response)
    return response