import os
import pyttsx3
import speech_recognition as sr
import eel
import time
import wikipedia
import webbrowser
import pywhatkit as wk
import subprocess
import datetime
import pyjokes
import pyautogui
import requests
import io
from PIL import Image
from spotipy.oauth2 import SpotifyOAuth
import spotipy

from engine.temperature import temp
# Import functions from other modules

API_URL = "https://api-inference.huggingface.co/models/OEvortex/HelpingAI-PixelCraft"
headers = {"Authorization": "Bearer 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"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.content

def generate_image():
    speak("Please describe the image you want to generate.")
    description = takeCommand().lower()
    
    # Call the image generation API with the description
    image_bytes = query({"inputs": description})
    
    # Check if the image data is returned successfully
    if image_bytes:
        try:
            # Open and display the generated image
            image = Image.open(io.BytesIO(image_bytes))
            image.show()

            # Save the image
            with open("generated_image.jpg", "wb") as f:
                f.write(image_bytes)
                
            speak("Image generated successfully.")
        except Exception as e:
            speak("Error occurred while generating the image.")
            print("Error:", e)
    else:
        speak("Failed to generate the image. Please try again later.")

# Set up Spotify API credentials
# os.environ['SPOTIPY_CLIENT_ID'] = 'b916c116b04e4c62839649671cd73a52'
# os.environ['SPOTIPY_CLIENT_SECRET'] = '06ade98e8d9a4c2e824f7ad435a44809'
# os.environ['SPOTIPY_REDIRECT_URI'] = 'http://localhost:8888/callback'

# def play_music_on_spotify():
#     speak("Which song would you like to play on Spotify?")
#     song_name = takeCommand().lower()
#     try:
#         sp = spotipy.Spotify(auth_manager=SpotifyOAuth(scope="user-read-playback-state,user-modify-playback-state"))
        
#         # Search for the song
#         results = sp.search(q=song_name, limit=1)
#         tracks = results['tracks']['items']
        
#         if not tracks:
#             speak("I couldn't find the song. Please try again.")
#             return

#         # Get the first track's URI
#         track_uri = tracks[0]['uri']

#         # Get the current playback device
#         devices = sp.devices()
#         if not devices['devices']:
#             speak("No active playback device found. Please start Spotify on your device.")
#             return

#         device_id = devices['devices'][0]['id']

#         # Start playback
#         sp.start_playback(device_id=device_id, uris=[track_uri])
#         speak(f"Playing {song_name} on Spotify.")
#     except Exception as e:
#         speak("An error occurred while trying to play the song on Spotify.")
#         print("Error:", e)

def speak(text):
    text = str(text)
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    Id = "com.apple.voice.compact.en-GB.Daniel"
    engine.setProperty('voice', Id)
    engine.setProperty('rate', 185)
    eel.DisplayMessage(text)
    eel.receiverText(text)
    engine.say(text)
    engine.runAndWait()

def wishMe():
    hour = int(datetime.datetime.now().hour)
    if 0 <= hour < 12:
        speak("Good morning sir! Rise and shine! How can I assist you today?")
    elif 12 <= hour < 18:
        speak("Afternoon greetings sir! I hope you're having a splendid day so far. How may I be of service to you this afternoon?")
    else:
        speak("Good evening sir! I hope you've had a wonderful day. How can I assist you during this peaceful evening?")

@eel.expose
def takeCommand():
    print('Listening...')
    eel.DisplayMessage("Listening...")
    r = sr.Recognizer()
    with sr.Microphone() as source:
        r.pause_threshold = 1
        audio = r.listen(source, 0, 8)

    try:
        print("Recognizing...")
        eel.DisplayMessage("Recognizing...")
        query = r.recognize_google(audio, language="en-in")
        eel.DisplayMessage(query)
        time.sleep(2)
        return query

    except sr.UnknownValueError:
        speak("Sorry, I didn't catch that. Can you repeat?")
        allCommands()
        return ""
    except sr.RequestError as e:
        speak(f"Could not request results from Google Speech Recognition service; {e}")
        return ""

def shutdown_mac():
    speak("Are you sure you want to shut down your Mac? Confirm with yes or no")
    confirm = takeCommand().lower()
    if "yes" in confirm:
        speak("Shutting down your Mac. Goodbye!")
        subprocess.call('osascript -e \'tell application "System Events" to shut down\'', shell=True)
    else:
        speak("Shutdown canceled. How can I assist you further?")

def restart_mac():
    speak("Are you sure you want to restart your Mac? Confirm with yes or no")
    confirm = takeCommand().lower()
    if "yes" in confirm:
        speak("Restarting your Mac. Please wait.")
        subprocess.call('osascript -e \'tell application "System Events" to restart\'', shell=True)
    else:
        speak("Restart canceled. How can I assist you further?")

def screenshot_mac():
    speak("Taking Screenshot...")
    speak("What name do you want to give to the screenshot?")
    qry = takeCommand().lower()
    command = f"screencapture ~/Desktop/{qry}.png"
    subprocess.run(command, shell=True)
    speak(f"Screenshot taken. Do you want to view the screenshot, {qry}? Speak yes or no")
    view_confirmation = takeCommand().lower()
    if "yes" in view_confirmation:
        subprocess.run(f"open ~/Desktop/{qry}.png", shell=True)
    else:
        speak("Okay, the screenshot is saved on your desktop.")

def mac_volume():
    speak("Do you want to set the volume to max, or at 50 percent, or you want to mute the volume")
    query = takeCommand().lower()
    if "50 percent" in query:
        os.system("osascript -e 'set Volume 5'")
        speak("Now the volume is set to 50 percent")
    elif "max" in query:
        os.system("osascript -e 'set Volume 10'")
        speak("Now the volume is set to max")
    elif "mute" in query:
        os.system("osascript -e 'set volume with output muted'")
        speak("Now the volume is muted")
    elif "unmute" in query:
        os.system("osascript -e 'set volume without output muted'")
        speak("Now the volume is unmuted")

@eel.expose
def allCommands(message=1):
    if message==1:
        query = takeCommand().lower()
        eel.senderText(query)
    else:
        query = message
        eel.senderText(query)

    while True:        
        if "who are you".lower() in query:
            speak("My Name is JARVIS. I can do anything that my creator programmed me to do.")
        elif "hi jarvis".lower() in query:
            speak("Hello Sir, How can i help you!")
        elif "who created you".lower() in query:
            speak("I was created by Mr. Meet Goel, and I am grateful to him for this life.")
        elif "what is" in query or "who is" in query:
            speak("Searching in Wikipedia...")
            query = query.replace("what is", "").replace("who is", "")
            results = wikipedia.summary(query, sentences=1)
            speak("According to Wikipedia...")
            speak(results)
        elif "play music" in query:
            musicPath = "/Users/meetgoel/Downloads/vigdiyanheeran.mp3"
            os.system(f"open {musicPath}")
        elif "the time" in query:
            hour = datetime.datetime.now().strftime("%-I")
            minute = datetime.datetime.now().strftime("%M")
            day_night = datetime.datetime.now().strftime("%p")
            speak(f"Sir, the time is {hour}:{minute} {day_night}")
        elif "open youtube" in query:
            speak("What will you like to watch sir...")
            qry = takeCommand().lower()
            wk.playonyt(qry)
        elif "search on youtube" in query:
            query = query.replace("search on youtube", "")
            webbrowser.open(f"https://www.youtube.com/results?search_query={query}")
        elif "open google" in query:
            speak("What should I search for?")
            qry = takeCommand().lower()
            webbrowser.open(f"https://www.google.com/search?q={qry}")
        elif "close safari" in query:
            speak("Closing Safari")
            os.system("killall Safari")
        # elif "play music on spotify" in query:
        #     play_music_on_spotify()
        elif "whatsapp" in query:
            if "to " in query:
                speak("Enter the number you want to send the message to:")
                number = input("")
                speak("Please tell me what message should I send")
                message = takeCommand()
                time.sleep(22)
                wk.sendwhatmsg_instantly(f"+91{number}", message, tab_close=True)
            else:
                default_number = 8745857662
                wk.sendwhatmsg_instantly(f"+91{default_number}", "This is a J.A.R.V.I.S Generated Message", tab_close=True)
                time.sleep(22)
            speak("Message sent successfully, sir")
        elif "temperature" in query:
            temp1 = temp(query)
            speak(f"Sir, the temperature is {temp1}")
        elif "joke" in query:
            speak("Sure, sir!")
            speak(pyjokes.get_joke())
        elif "close this tab" in query:
            pyautogui.hotkey('command', 'w')
        elif "open new tab" in query:
            pyautogui.hotkey('command', 't')
        elif "open new window" in query:
            pyautogui.hotkey('command', 'n')
        elif "shutdown".lower() in query:
            shutdown_mac()
        elif "restart" in query:
            restart_mac()
        elif "take a screenshot" in query:
            screenshot_mac()
        elif "generate image" in query:
            generate_image()
        elif "set volume" in query:
            mac_volume()
        elif "exit".lower() in query:
            speak("Signing off sir!, Have a great day!")
            break
        else:
            from engine.features import chatBot
            chatBot(query)

     # Get new command
        query = takeCommand().lower()
        eel.senderText(query)

    eel.ShowHood()

