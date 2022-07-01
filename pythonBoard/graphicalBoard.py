import wx
import requests
import os

#List of cards used in the different slots
listesCartesSlotEtat = ["carte état initial","carte état final","carte état"]
listesCartesSlotInfosMapping = ["carte mapping", "carte mapping 2"]
listesCartesSlotSpecEtat = ["carte entry","carte exit"]
listesCartesSlotSpecTransition = ["carte garde","carte action"]
listesCartesSlotTransition = ["transition gauche-droite","transition droite-gauche","transition gauche-gauche","transition droite-droite"]
listesCartesSlotPattern = ["carte pattern composite","carte pattern enregistrable"]

host = 'http://localhost:3000/card'


#Function used to send the card info to the nodeJs server
def sendServer(slot,info):
    data = {'slot': slot, 'cardID': info}
    print(data)
    r = requests.post(host, data)
    print(r.text)

#Graphical slot definition
class Slot(wx.Panel):

    #----------------------------------------------------------------------
    def __init__(self, parent, label, color, choices, number):
        """Constructor"""
        wx.Panel.__init__(self, parent)
        self.SetBackgroundColour(color)
        self.label = label
        self.number = number
        lbl = wx.StaticText(self, label=label)
        font = wx.Font(10, wx.DECORATIVE, wx.ITALIC, wx.NORMAL)
        lbl.SetFont(font)


        v_sizer = wx.BoxSizer(wx.VERTICAL)
        self.combo = wx.ComboBox(self, choices = choices)
        self.combo.Bind(wx.EVT_COMBOBOX, self.onCombo)
        v_sizer.Add(self.combo, 0, wx.ALL|wx.EXPAND|wx.BOTTOM, 10)
        sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(lbl, 0, wx.ALL|wx.CENTER, 15)
        sizer.Add(v_sizer, 0, wx.ALL, 5)


        self.SetSizer(sizer)


    def onCombo(self, event):
        self.phaseSelection = self.combo.GetValue()
        print (self.label+": "+self.phaseSelection)
        sendServer(self.number,self.phaseSelection)

########################################################################
class MainPanel(wx.Panel):
    """"""

    #----------------------------------------------------------------------
    def __init__(self, parent):
        """Constructor"""
        wx.Panel.__init__(self, parent)

        slots = [("plum","slot infos/mapping",listesCartesSlotInfosMapping),
                  ("green","slot pattern",listesCartesSlotPattern),
                  ("coral","slot correction",listesCartesSlotEtat),
                  ("cyan","slot état 1",listesCartesSlotEtat+listesCartesSlotPattern+listesCartesSlotInfosMapping),
                  ("red","slot transition",listesCartesSlotTransition),
                  ("cyan","slot état 2",listesCartesSlotEtat+listesCartesSlotPattern+listesCartesSlotInfosMapping),
                  ("pink","slot spécialisation état 1",listesCartesSlotSpecEtat),
                  ("pink","slot spécialisation transition",listesCartesSlotSpecTransition),
                  ("pink","slot spécialisation état 2",listesCartesSlotSpecEtat)]

        #Slots in a grid of 3x3
        gs = wx.GridSizer(3, 3, 5, 5) 
		
        number = 1
        for color, label, choix in slots:
            panel = Slot(self, label, color, choix, number)
            gs.Add(panel, 1, wx.EXPAND)
            number=number+1

        self.SetSizer(gs)

########################################################################
class MainFrame(wx.Frame):
    """"""

    #----------------------------------------------------------------------
    def __init__(self):
        """Constructor"""
        wx.Frame.__init__(self, None, title="cardSFM Board", size=(600,600))
        MainPanel(self)
        self.Show()

#----------------------------------------------------------------------
if __name__ == "__main__":
    app = wx.App(False)
    frame = MainFrame()
    app.MainLoop()


