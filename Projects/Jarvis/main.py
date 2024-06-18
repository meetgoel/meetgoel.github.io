import os
import cv2
import numpy
import face_recognition
import eel
import warnings
from engine.features import *
from engine.command import *
from engine.Clap import MainClapExe

# Initialize Eel
eel.init("www")
speak("Attention please!, To proceed, just give a quick clap. Let's get started!")
MainClapExe()
warnings.simplefilter('ignore')
playAssistantSound()

speak("Hello there! Welcome to our system. I'm here to assist you throughout your experience. Just a heads up, we're about to start the face recognition process. Get ready, and let's begin!")

class FaceRecognition:
    def __init__(self, image_path='image_path'):
        self.encodeList = []  # List to store encoded face images
        self.classNames = []  # List to store corresponding class names
        self.image_path = image_path
        self.load_encoded_images()

    def load_encoded_images(self):
        print("Encoding started...")
        if not os.path.exists(self.image_path):
            os.mkdir(self.image_path)

        photolist = os.listdir(self.image_path)
        for cl in photolist:
            currentImage = cv2.imread(f'{self.image_path}/{cl}')
            
            if currentImage is None:
                print(f"Warning: Unable to load image {cl}. Skipping...")
                continue

            self.classNames.append(os.path.splitext(cl)[0])

            try:
                # Convert image to RGB format
                currentImage = cv2.cvtColor(currentImage, cv2.COLOR_BGR2RGB)
                # Encode face
                encodeCurFrame = face_recognition.face_encodings(currentImage)
                
                if encodeCurFrame:
                    self.encodeList.append(encodeCurFrame[0])
                else:
                    print(f"Warning: No face found in image {cl}. Skipping...")
            except Exception as e:
                print(f"Error processing image {cl}: {e}")

        print("Images encoded successfully")

    def recognize_faces(self, image):
        faces = face_recognition.face_locations(image)
        if len(faces) == 0:
            print("No face detected")
            return None

        encodeCurrentFrame = face_recognition.face_encodings(image, faces)
        for encodeFace, faceLocation in zip(encodeCurrentFrame, faces):
            match = face_recognition.compare_faces(self.encodeList, encodeFace, tolerance=0.5)
            if any(match):
                bestMatchIndex = numpy.argmax(match)
                name = self.classNames[bestMatchIndex]
                print(f"Recognized face: {name}")
                y1, x2, y2, x1 = faceLocation
                cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(image, name, (x1 - 6, y2 + 20), cv2.FONT_HERSHEY_COMPLEX, 0.5, (255, 255, 255), 1)
                return name
        return None

def main():
    face_recognition = FaceRecognition()

    # Initialize video capture
    capture = cv2.VideoCapture(0)  # 0 for webcam

    while True:
        ret, frame = capture.read()
        if not ret:
            print("Failed to capture frame")
            break

        # Convert the frame to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Perform face recognition
        recognized_face = face_recognition.recognize_faces(rgb_frame)

        if recognized_face is not None:
            print(f"Face recognized: {recognized_face}")
            speak("Congratulations! Your face has been successfully recognized. You're all set to proceed.")
            # Initialize the MainClapExe and warnings
            wishMe()
            os.system('open -na "Google Chrome" --args --app="http://localhost:8000/index.html"')
            break

        # Display the resulting frame
        cv2.imshow('Video', frame)

        # Press 'q' to quit the video capture
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # When everything is done, release the capture and close windows
    capture.release()
    cv2.destroyAllWindows()

    # Start the Eel web app
    eel.start("index.html", mode=None, host='localhost', block=True,size=(1920, 1080),fullscreen=True)

if __name__ == '__main__':
    main()
