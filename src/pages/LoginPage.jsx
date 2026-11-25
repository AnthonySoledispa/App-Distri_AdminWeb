import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth.js';
import { consumirFlash, leerFlash } from '../services/almacenSesion.js';
import { mensajeLogin } from '../utils/mensajesError.js';
import { validarCorreo } from '../utils/validacionesUsuario.js';
import logo from '../assets/logo-distrigo.png';
import Boton from '../components/ui/Boton.jsx';
import CampoTexto from '../components/ui/CampoTexto.jsx';
import Alerta from '../components/ui/Alerta.jsx';

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [flash] = useState(() => leerFlash());
  const refContrasena = useRef(null);
  const refCorreo = useRef(null);

  useEffect(() => {
    document.title = 'Iniciar sesión | DistriGO';
    if (flash) consumirFlash();
  }, [flash]);

  async function alEnviar(e) {
    e.preventDefault();
    if (enviando) return;

    const nuevos = {};
    if (correo.trim() === '') nuevos.correo = 'El correo es obligatorio.';
    else {
      const msg = validarCorreo(correo);
      if (msg) nuevos.correo = msg;
    }
    if (contrasena === '') nuevos.contrasena = 'La contraseña es obligatoria.';
    setErrores(nuevos);
    setErrorGeneral('');
    if (nuevos.correo) return refCorreo.current?.focus();
    if (nuevos.contrasena) return refContrasena.current?.focus();

    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), contrasena);
      navigate(ubicacion.state?.desde || '/', { replace: true });
    } catch (err) {
      setErrorGeneral(mensajeLogin(err));
      setContrasena('');
      setVerContrasena(false);
      setEnviando(false);
      refContrasena.current?.focus();
    }
  }

  return (
    <main className="login">
      <div className="login__tarjeta">
        <div className="login__marca">
          <img src={logo} alt="Logotipo de DistriGO" width="160" height="160" />
          <h1>Panel de administración</h1>
        </div>

        {flash && !errorGeneral && <Alerta tipo="info">{flash}</Alerta>}
        {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}

        <form onSubmit={alEnviar} noValidate>
          <CampoTexto
            ref={refCorreo}
            etiqueta="Correo electrónico"
            type="email"
            name="correo"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errores.correo}
            readOnly={enviando}
            maxLength={150}
          />
          <CampoTexto
            ref={refContrasena}
            etiqueta="Contraseña"
            type={verContrasena ? 'text' : 'password'}
            name="contrasena"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errores.contrasena}
            readOnly={enviando}
            accion={
              <Boton
                variante="secundario"
                onClick={() => setVerContrasena((v) => !v)}
                aria-pressed={verContrasena}
                disabled={enviando}
              >
                {verContrasena ? 'Ocultar' : 'Mostrar'}
              </Boton>
            }
          />
          <Boton type="submit" className="login__enviar" cargando={enviando} textoCargando="Ingresando…">
            Ingresar
          </Boton>
        </form>
      </div>
    </main>
  );
}
