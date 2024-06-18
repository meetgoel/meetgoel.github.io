#pip3 install sounddevice

import sounddevice as sd
import numpy as np

threshold = 70.0
Clap = False

#it compares the received data with the threshold and if the volumenorm is greater than a clap is made else not.
def detect_clap(indata,frames,time,status):
    global Clap
    volume_norm = np.linalg.norm(indata) * 10
    if volume_norm>threshold:
        print("Clapped!")
        Clap = True


#takes the data from our mic and sending to the detect_clap function
def Listen_for_claps():
    with sd.InputStream(callback=detect_clap):
        return sd.sleep(1000)
    
def MainClapExe():
# if __name__ == "__main__":
    while True:
        Listen_for_claps()
        if Clap==True:
            break
        else:
            pass


