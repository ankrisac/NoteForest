import http.server
import webbrowser
import os

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def respond(self, code, fmt):
        self.send_response(code)
        self.send_header("Content-type", fmt)
        self.end_headers()
    
    def load_file(self, file_name):
        try:
            with open(f"data/{file_name}.json", "rb") as file:
                data = file.read()
        except FileNotFoundError:
            print(f"-- Create new Graph! '{file_name}'")
            self.respond(404, "text/json")
        else:
            self.respond(200, "text/json")
            self.wfile.write(data)

    def save_file(self, file_name):       
        data = self.rfile.read(int(self.headers["Content-Length"]))        

        self.respond(200, "text/html")

        print(f"-- Saving Graph '{file_name}'")
        with open(f"data/{file_name}.json", "wb") as file:
            file.write(data)

    
    def load_resource(self, path):
        try:
            
            ext_map = {
                ".html": ("text/html", "r"),
                ".css": ("text/css", "r"),
                
                ".js": ("application/javascript", "r"),
                ".mjs": ("application/javascript", "r"),
                ".json": ("application/json", "r"),

                ".ttf": ("font/ttf", "rb"),
                ".woff": ("font/woff", "rb"),
                ".woff2": ("font/woff2", "rb")
            }

            _, ext = os.path.splitext(path)

            if ext not in ext_map:
                raise Exception("Unknown file type")

            http_fmt, read_fmt = ext_map[ext]
            self.respond(200, http_fmt)

            data = open(path, read_fmt).read()
            self.wfile.write(data.encode() if read_fmt == "r" else data)
        except Exception as ex:
            print(f"-- EXCEPTION\n{ex}")
            print(f"-- File '{path}' not found'")

            CODE = 404

            self.respond(CODE, "text/html")
            with open("src/other/errorpage.html") as file:
                self.wfile.write(
                    file.read()
                        .replace("{code}", f"{CODE}"))
            
    def do_GET(self):
        if self.path == "/":
            self.load_resource("index.html")
        elif self.path.startswith("/$/data_load"):
            self.load_file("tutorial")
        else:
            self.load_resource(self.path[1:])
            

    def do_POST(self):
        if self.path.startswith("/$/data_save"):
            print("-- Saving File!")
            self.save_file("tutorial")
        else:
            self.respond(404, "text/html")
        
    def log_message(self, fmt, *args):
        msg, status, _ = args
        print(f"-- [{status}] {msg}")

def run_server():
    PORT = 8000

    with http.server.HTTPServer(("", PORT), RequestHandler) as httpd:
        try:
            print(f"-- Serving on PORT[{PORT}]")
            webbrowser.open(f"localhost:{PORT}")
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("-- Stopping Server ...")

def main():
    run_server()

    while True:            
        cmd = input("> ").lower().strip()
        
        if cmd in ["quit", "exit"]:
            break
        elif cmd == "restart":
            run_server()
        else:
            print(f"{cmd} is not defined")

        

if __name__ == "__main__":
    main()    