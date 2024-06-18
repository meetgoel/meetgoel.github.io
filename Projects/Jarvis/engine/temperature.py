import requests
from bs4 import BeautifulSoup

def temp(search):
    url = f"https://www.google.com/search?q={search}"
    r= requests.get(url)
    data = BeautifulSoup(r.text,"html.parser")
    temperature = data.find("div",class_="BNeawe").text
    print(temperature)

    return temperature
