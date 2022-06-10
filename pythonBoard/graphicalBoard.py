import wx
import requests

listesCartesSlotEtat = ["carte état initial","carte état final","carte état test","carte état 1","carte état 2","carte état 3","carte état 4"]
listesCartesSlotSpecEtat = ["carte entry","carte exit"]
listesCartesSlotSpecTransition = ["carte garde","carte action"]
listesCartesSlotTransition = ["transition gauche-droite","transition droite-gauche","transition gauche-gauche","transition droite-droite"]
listesCartesSlotPattern = ["carte pattern composite","carte pattern vide"]

host = 'http://localhost:3000/card'



def sendServer(slot,info):
    data = {'slot': slot, 'cardID': info}
    print(data)
    r = requests.post(host, data)
    print(r.text)


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

        hsizer = wx.BoxSizer(wx.HORIZONTAL)
        hsizer2 = wx.BoxSizer(wx.HORIZONTAL)
        v_sizer = wx.BoxSizer(wx.VERTICAL)

        slots = [("plum","slot infos/mapping",listesCartesSlotEtat),
                  ("green","slot pattern",listesCartesSlotPattern),
                  ("coral","slot correction",listesCartesSlotEtat),
                  ("cyan","slot état 1",listesCartesSlotEtat+listesCartesSlotPattern),
                  ("red","slot transition",listesCartesSlotTransition),
                  ("turquoise","slot état 2",listesCartesSlotEtat+listesCartesSlotPattern),
                  ("pink","slot spécialisation état 1",listesCartesSlotSpecEtat),
                  ("pink","slot spécialisation transition",listesCartesSlotSpecTransition),
                  ("pink","slot spécialisation état 2",listesCartesSlotSpecEtat)]

        #p = wx.Panel(self) 
         
        gs = wx.GridSizer(3, 3, 5, 5) 
		
        #for i in range(1,10): 
            #btn = "Btn"+str(i) 
            #gs.Add(wx.Button(self,label = btn),0,wx.EXPAND) 

            #p.SetSizer(gs)
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
        panel = MainPanel(self)
        self.Show()

#----------------------------------------------------------------------
if __name__ == "__main__":
    app = wx.App(False)
    frame = MainFrame()
    app.MainLoop()


