from pickle import TRUE
import requests

urlEtat = 'http://localhost:3000/etat'
urlTransi = 'http://localhost:3000/transition'


while TRUE:
    action = input("Ajouter un état [1], une transition [2]: ")
    if action=="1":
        #name = input("Ajoute un état, son nom: ")
        #type = input("son type (regular, initial, final): ")
        etat = {'name': "placeholder", 'type': "regular"}

        r = requests.post(urlEtat, data=etat)
        print(r.text)

    else:
        start = input("nom de l'état de départ: ")
        end = input("nom de l'état d'arrivée': ")
        transition = {'from': start, 'to': end}

        r = requests.post(urlTransi, data=transition)
        print(r.text)