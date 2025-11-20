//App Principal 
let stream = null; //Mediastream actual de la camara 
let currentFacing = 'environment'; //Uaser = frontal y Enviroment = trasera
let mediaRecorder = null; //Instanacia de media recorder para audio 
let chunks = []; //Buffers para audio grabado
let beforeInstallEvent = null; //Evento diferido para mostrar el boton de instalacion 

//Acesos rapidos del DOM
const $ = (sel) => document.querySelector(sel);
const video = $('#video'); //Etiqueta video donde se muestra el stream
const canvas = $('#canvas'); //Contenedor de capturar fotos
const photos = $('#photos'); // Contenedor de fotos capturadas
const audios = $('#audios'); //Contenedor de audios grabados
const btnStartCam = $('#btnStartCam'); //Boton para iniciar la camara
const btnStopCam = $('#btnStopCam'); //Boton para parar la camara
const btnFlip = $('#btnFlip'); //Boton para cambiar camara
const btnTorch = $('#btnTorch'); //Boton para encender/apagar la linterna
const btnShot = $('#btnShot'); //Boton para capturar foto
const videoDevices = $('#videoDevices'); //Select para camara
const btnStartRec = $('#btnStartRec'); //Boton para iniciar grabacion de audio
const btnStopRec = $('#btnStopRec'); //Boton para parar grabacion de audio
const recStatus = $('#recStatus'); //Indicado de el estado de grabacion
const btnInstall = $('#btnInstall'); //Boton instalar la pwa

//Instalacion de la pwa (A2HS)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); //Evita que el navegador muestre el prompt por defecto
    beforeInstallEvent = e; //Guarda el evento para lanzarlo manuelmente
    btnInstall.hidden = false; //Muestra el boton de "Instalar"
});

btnInstall.addEventListener('click',async () => {
    if (!beforeInstallEvent) return;//Si no hay evento alamacenado no hacemos nada
    beforeInstallEvent.prompt(); //Dispara el dialogo de instalacion
    await beforeInstallEvent.userChoice; //Espera la eleccion del usuario
    btnInstall.hidden = true; //Oculta el boton tras la decision
    beforeInstallEvent = null; //Limpia la referencia
});

//camara listado y control
 async function listVideoInputs(){
    try{
        //pide al navegador todos los dispositivos multimedia
        const devices = await navigator.mediaDevices.enumerateDevices();
        //filtra solo entradas de video
        const cams = devices.filter(d => d.kind === 'videoinput');

        //vacia el select y lo rellena con las camaras detectadas
        videoDevices.innerHTML = '';
        cams.forEach((d,i) => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `camara ${i+1}`;
            //deviceID que usaremos para getUserMedia
            videoDevices.appendChild(opt);
        });
    } catch(err){
        console.warn('Nose puede enumerar dispositios.', err);
    }
     }
     async function startcam(constraints = {}) {
        //verifica el soporte de media device atra vez de https
        if (!('mediaDevices' in navigator)){
            alert ('Este navegador no soporta el acceso a camara/micro');
            return;
        }
        try{
            //solicita el stream de video + cualquier postrain extra recibido
            stream = await navigator.mediaDevices.getUserMedia({
                video : {facingMode: currentFacing, ...constraints},
                audio: false
            });

            //Enlaza el stream al select de video para visualizar
            video.srcObject = stream;

            //habilitar los controles relacionados
            btnStopCam.disabled = false;
            btnShot.disabled = false;
            btnFlip.disabled = false;
            btnTorch.disabled  = false;
            //Actualiza el listado de camaras disponibkes
            await listVideoInputs();

        } catch(err){
            alert('No se pudo iniciar la camara:' + err.message);
            console.error(err);
        }
        
     }

     function stopCam(){
        //detiene todas las pistas del stream de video y libera la camara
        if (stream){ stream.getTracks().forEach(t => t.stop())}
        stream = null;
        video.srcObject = null;

        //deshabilita controles de camara
        btnStopCam.disabled = true;
        btnShot.disabled = true;
        btnFlip.disabled = true;
        btnTorch.disabled = true;
     }

     //botones de control de camara
     btnStartCam.addEventListener('click', ()=> startcam());
     btnStopCam.addEventListener('click', stopCam);

     btnFlip.addEventListener('click', async () => {
        //alterna entre camara frontal y trasera y reinicia el stream
        currentFacing = (currentFacing === 'enviroment') ? 'user': 'environment';
        stopCam();
        await startcam;
     });

     videoDevices.addEventListener('change', async (e) => {
        //cambia a un deviced especifico en el selec
        const id = e.target.value;
        stopCam();
        await startcam({ deviceId: {exact: id } });
     });

     btnTorch.addEventListener('click', async() => {
        //algunas plataformas permiten activas la linterna con apli constrains
        try{
            const [track] = stream ? stream.getVideoTracks() : [];
            if(!track) return;
            const cts = track.getConstraints();
            //alterna el estado del torch de forma simple usando  naive toggle
            const torch = !(cts.advanced && cts.advanced[0]?.torch);
            await track.applyConstraints({advanced: [{torch}] });
        } catch(err){
            alert('la linterna no es compatible con este dispositivo o navegador');
        }
     });