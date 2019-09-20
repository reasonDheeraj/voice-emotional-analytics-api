import os
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket
import wave
import uuid
import gc
import sys
import scipy.io.wavfile
sys.path.append("api")
import Vokaturi
from shutil import copyfile

#from opus.decoder import Decoder as OpusDecoder
Vokaturi.load("api/OpenVokaturi-3-3-win64.dll")
#Vokaturi.load("api/OpenVokaturi-3-3-linux64.so")
print ("Analyzed by: %s" % Vokaturi.versionAndLicense())


def analyze():
    file_name = "tempFile.wav"
    (sample_rate, samples) = scipy.io.wavfile.read(file_name)
    buffer_length = len(samples)
    c_buffer = Vokaturi.SampleArrayC(buffer_length)
    if samples.ndim == 1:  # mono
            c_buffer[:] = samples[:] / 32768.0
    else:  # stereo
            c_buffer[:] = 0.5*(samples[:,0]+0.0+samples[:,1]) / 32768.0
    voice = Vokaturi.Voice (sample_rate, buffer_length)
    voice.fill(buffer_length, c_buffer)
    quality = Vokaturi.Quality()
    emotionProbabilities = Vokaturi.EmotionProbabilities()
    voice.extract(quality, emotionProbabilities)
    
    if quality.valid:
            print ("Neutral: %.3f" % emotionProbabilities.neutrality)
            print ("Happy: %.3f" % emotionProbabilities.happiness)
            print ("Sad: %.3f" % emotionProbabilities.sadness)
            print ("Angry: %.3f" % emotionProbabilities.anger)
            print ("Fear: %.3f" % emotionProbabilities.fear)
    else:
            print ("Not enough sonorancy to determine emotions")
    return (emotionProbabilities.neutrality,emotionProbabilities.happiness,emotionProbabilities.sadness,emotionProbabilities.anger,emotionProbabilities.fear)


clients = {}
class OpusDecoderWS(tornado.websocket.WebSocketHandler):
    
    def open(self):
        print('new connection')
        self.client_id = str(uuid.uuid4())
        self.initialized = False
        clients[self.client_id] = self
        print(clients)
        self.count = 0
        self.runtimeWriter = False
        #self.write_message("The server says: 'Hello'. Connection was accepted.")

    def my_init(self, msg) :

#        print(msg)
        rate, is_encoded, op_rate, op_frm_dur = [int(i) for i in msg.split(',')]
        #rate : actual sampling rate
        #op_rate : the rate we told opus encoder
        #op_frm_dur : opus frame duration
        filename = str(uuid.uuid4()) + '.wav'
        wave_write = wave.open(filename, 'wb')
        wave_write.setnchannels(1)
        wave_write.setsampwidth(2) #int16, even when not encoded
        wave_write.setframerate(rate)

        if self.initialized :
            self.wave_write.close()

        self.is_encoded = is_encoded
#        self.decoder = OpusDecoder(op_rate, 1)
        self.rate = rate
        self.frame_size = op_frm_dur * op_rate
        self.wave_write = wave_write
        self.initialized = True

    def on_message(self, data) :

        if str(data).startswith('m:') :
            self.my_init(str(data[2:]))
        else :
            if self.is_encoded :
                pcm = self.decoder.decode(data, self.frame_size, False)
                self.wave_write.writeframes(pcm)

                # force garbage collector
                # default rate of cleaning is not sufficient
                gc.collect()

            else :
#                print(len(data))
                self.analyzeStream(data)
                self.wave_write.writeframes(data)

    def on_close(self):

        if self.initialized :
            self.wave_write.close()
        print(clients)
        print('connection closed')

    def analyzeStream(self,data):
        if self.count < 120:
            if self.runtimeWriter is False:
                filename = 'tempFile.wav'
                self.wave_write1 = wave.open(filename, 'wb')
                self.runtimeWriter = True
                self.wave_write1.setnchannels(1)
                self.wave_write1.setsampwidth(2) #int16, even when not encoded
                self.wave_write1.setframerate(self.rate)
                print("in+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
            self.wave_write1.writeframes(data)
            self.count = self.count + 1
        elif self.count == 120:
            if self.runtimeWriter is True:
                print("out+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
                neutrality,happiness,sadness,anger,fear = analyze()
                self.write_message({'neutral':float(neutrality),'happy':float(happiness),'sad':float(sadness),'anger':float(anger),'fear':float(fear)})
                self.wave_write1.close()
                #copyfile('tempFile.wav', str(uuid.uuid4()) +'-'+ str(neutrality) + '-'+ str(happiness)+'-' + str(sadness) + '-' + str(anger) + '-'+ str(fear))
            self.count = 0
            self.runtimeWriter = False
        else:
            self.count = 0
        
class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("www/index.html")

app = tornado. web.Application([
    (r'/ws', OpusDecoderWS),
    (r'/', MainHandler),
    (r'/(.*)', tornado.web.StaticFileHandler, { 'path' : './www' })
])

http_server = tornado.httpserver.HTTPServer(app)
http_server.listen(int(os.environ.get('PORT', 8881)))
print('http server started')
tornado.ioloop.IOLoop.instance().start()
