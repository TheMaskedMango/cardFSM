from pickle import TRUE
import requests 
import requests

urlEtat = 'http://localhost:3000/etat'


while TRUE:
    name = input("Ajoute un état, son nom: ")
    type = input("son type (regular, initial, final): ")
    etat = {'name': name, 'type': type}

    # Output => OK
    r = requests.post(urlEtat, data=etat)
    print(r.text)


