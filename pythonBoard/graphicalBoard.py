import wx
import requests

listesCartesSlotEtat = ["carte état initial","carte état test","carte état 1","carte état 2","carte état 3","carte état 4"]
listesCartesSlotSpecEtat = ["carte entry","carte exit"]
listesCartesSlotSpecTransition = ["carte garde","carte action"]
listesCartesSlotTransition = ["transition gauche-droite","transition droite-gauche","transition gauche-gauche","transition droite-droite"]

host = 'http://localhost:3000/'



def sendServer(slot,info):
    if("slot état 1" in slot):
        slotURL = 'etat1'
    elif("slot état 2" in slot):
        slotURL = 'etat2'
    elif("slot transition" in slot):
        slotURL = 'transition'
    data = {'cardID': info}
    print(data)
    url = host + slotURL
    r = requests.post(url, data)
    print(r.text)


class Slot(wx.Panel):

    #----------------------------------------------------------------------
    def __init__(self, parent, label, color, choices):
        """Constructor"""
        wx.Panel.__init__(self, parent)
        self.SetBackgroundColour(color)
        self.label = label
        lbl = wx.StaticText(self, label=label)


        v_sizer = wx.BoxSizer(wx.VERTICAL)
        self.combo = wx.ComboBox(self, choices = choices)
        self.combo.Bind(wx.EVT_COMBOBOX, self.onCombo)
        v_sizer.Add(self.combo, 0, wx.ALL|wx.EXPAND|wx.BOTTOM, 10)
        sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(lbl, 0, wx.ALL|wx.CENTER, 5)
        sizer.Add(v_sizer, 0, wx.ALL, 5)


        self.SetSizer(sizer)


    def onCombo(self, event):
        self.phaseSelection = self.combo.GetValue()
        print (self.label+": "+self.phaseSelection)
        sendServer(self.label,self.phaseSelection)

########################################################################
class MainPanel(wx.Panel):
    """"""

    #----------------------------------------------------------------------
    def __init__(self, parent):
        """Constructor"""
        wx.Panel.__init__(self, parent)

        hsizer = wx.BoxSizer(wx.HORIZONTAL)
        hsizer2 = wx.BoxSizer(wx.HORIZONTAL)
        v_sizer = wx.BoxSizer(wx.VERTICAL)

        slots = [("purple","slot infos",listesCartesSlotEtat),
                  ("green","slot pattern",listesCartesSlotEtat),
                  ("coral","slot correction",listesCartesSlotEtat),
                  ("blue","slot état 1",listesCartesSlotEtat),
                  ("red","slot transition",listesCartesSlotTransition),
                  ("blue","slot état 2",listesCartesSlotEtat),
                  ("pink","slot spécialisation état 1",listesCartesSlotSpecEtat),
                  ("pink","slot spécialisation transition",listesCartesSlotSpecTransition),
                  ("pink","slot spécialisation état 2",listesCartesSlotSpecEtat)]

        #p = wx.Panel(self) 
         
        gs = wx.GridSizer(3, 3, 5, 5) 
		
        #for i in range(1,10): 
            #btn = "Btn"+str(i) 
            #gs.Add(wx.Button(self,label = btn),0,wx.EXPAND) 

            #p.SetSizer(gs)

        for color, label, choix in slots:
            panel = Slot(self, label, color, choix)
            gs.Add(panel, 1, wx.EXPAND)





        self.SetSizer(gs)

########################################################################
class MainFrame(wx.Frame):
    """"""

    #----------------------------------------------------------------------
    def __init__(self):
        """Constructor"""
        wx.Frame.__init__(self, None, title="cardSFM Board", size=(600,600))
        panel = MainPanel(self)
        self.Show()

#----------------------------------------------------------------------
if __name__ == "__main__":
    app = wx.App(False)
    frame = MainFrame()
    app.MainLoop()


