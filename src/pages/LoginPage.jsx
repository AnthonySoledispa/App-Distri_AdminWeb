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
import RutaReparto from '../components/ui/RutaReparto.jsx';

/** Ojo para mostrar la contraseña; tachado cuando ya se ve, para ofrecer ocultarla. */
function IconoOjo({ tachado }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <path d="M4 4l16 16" />}
    </svg>
  );
}

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
  const [verFlash, setVerFlash] = useState(true);
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
    setVerFlash(false);
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
      <section className="login__escena" aria-label="Presentación de DistriGO">
        <p className="login__nombre">DistriGO</p>
        <div className="login__mensaje">
          <p className="login__lema">Gestiona, ordena, distribuye.</p>
          <p className="login__texto">
            Inventario, pedidos, rutas y cobros de su distribuidora en un solo lugar, desde la bodega hasta la
            última tienda.
          </p>
        </div>
        <RutaReparto className="login__ruta" />
      </section>

      <div className="login__lado">
        <div className="login__tarjeta">
          <div className="login__marca">
            <img src={logo} alt="Logotipo de DistriGO" width="132" height="132" />
            <h1>Panel de administración</h1>
            <p>Ingrese con su cuenta de administrador.</p>
          </div>

          {flash && verFlash && !errorGeneral && <Alerta tipo="info">{flash}</Alerta>}
          {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}

          <form onSubmit={alEnviar} noValidate>
            <CampoTexto
              ref={refCorreo}
              etiqueta="Correo electrónico"
              type="email"
              name="correo"
              autoComplete="username"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                if (errores.correo) setErrores((prev) => ({ ...prev, correo: undefined }));
              }}
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
              onChange={(e) => {
                setContrasena(e.target.value);
                if (errores.contrasena) setErrores((prev) => ({ ...prev, contrasena: undefined }));
              }}
              error={errores.contrasena}
              readOnly={enviando}
              className="campo--ojo"
              accion={
                <button
                  type="button"
                  className="campo__ojo"
                  onClick={() => setVerContrasena((v) => !v)}
                  aria-pressed={verContrasena}
                  aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={enviando}
                >
                  <IconoOjo tachado={verContrasena} />
                </button>
              }
            />
            <Boton type="submit" className="login__enviar" cargando={enviando} textoCargando="Ingresando…">
              Ingresar
            </Boton>
          </form>
        </div>
        <p className="login__pie">Acceso solo para administradores. Los repartidores usan la app móvil.</p>
      </div>
    </main>
  );
}
