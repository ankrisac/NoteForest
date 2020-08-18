const XHR = {
    request: (method, url, data) => {
        return new Promise(
            (resolve, reject) => {
                const xhr = new XMLHttpRequest();
    
                xhr.open(method, url);
                xhr.responseType = "json";
    
                if(data){
                    xhr.setRequestHeader("Content-Type", "application/json");
                }
    
                xhr.onload = () => { 
                    if(xhr.status >= 400){
                        reject("Load failed");
                    }
                    else{
                        resolve(xhr.response); 
                    }
                };
                xhr.onerror = () => { reject("Something went wrong!"); };
                xhr.send(JSON.stringify(data));
            }
        );
    }
};