# backend_py/utils/email_service.py
import os
import asyncio
import resend
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.environ.get("RESEND_API_KEY", "re_PfPu4qwt_Ln1L1spqYC3969aG8b5CwSHc")
DEFAULT_FROM = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

async def send_email(to: str, subject: str, html: str, from_email: Optional[str] = None) -> bool:
    if not resend.api_key:
        print("ERROR: RESEND_API_KEY no configurada")
        return False
    try:
        params = {
            "from": from_email or DEFAULT_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, lambda: resend.Emails.send(params))
        print(f"Correo enviado a {to} - ID: {result.get('id')}")
        return True
    except Exception as e:
        print(f"Error enviando correo: {e}")
        return False

def render_template(template_name: str, data: dict) -> str:
    """Renderiza una plantilla HTML para correos."""
    base_style = """
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .footer { background: #e9ecef; color: #6c757d; text-align: center; padding: 12px; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        .alert { color: #dc2626; font-weight: bold; }
    </style>
    """
    
    templates = {
        "test": f"""
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header"><h2>Prueba de correo</h2></div>
                <div class="content">
                    <p>Este es un correo de prueba del sistema ITAM.</p>
                    <p>Datos: {data}</p>
                </div>
                <div class="footer">Sistema de Gestión de Activos TI</div>
            </div>
        </body>
        </html>
        """,
        
        "firma_acta": f"""
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header"><h2>Acta de Entrega - {data.get('equipo_placa', 'Equipo')}</h2></div>
                <div class="content">
                    <p>Hola <strong>{data.get('nombre_usuario', 'usuario')}</strong>,</p>
                    <p>Se te ha asignado el equipo con placa <strong>{data.get('equipo_placa', 'N/A')}</strong>.</p>
                    <p>Para formalizar la entrega, debes firmar el acta digitalmente haciendo clic en el siguiente botón:</p>
                    <a href="{data.get('url_firma', '#')}" class="button">Firmar acta</a>
                    <p>El enlace expirará en 48 horas.</p>
                    <p>Si no puedes ver el botón, copia y pega este enlace en tu navegador:<br>
                    {data.get('url_firma', '#')}</p>
                </div>
                <div class="footer">Sistema de Gestión de Activos TI</div>
            </div>
        </body>
        </html>
        """,
        
        "stock_bajo": f"""
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header"><h2>⚠️ Alerta de Stock Bajo</h2></div>
                <div class="content">
                    <p>El suministro <strong>{data.get('nombre', 'N/A')}</strong> está por agotarse.</p>
                    <ul>
                        <li>Stock actual: <span class="alert">{data.get('stock_actual', 0)}</span></li>
                        <li>Stock mínimo: {data.get('stock_minimo', 0)}</li>
                    </ul>
                    <p>Por favor, realiza una nueva compra.</p>
                </div>
                <div class="footer">Sistema de Inventarios</div>
            </div>
        </body>
        </html>
        """,
        
        "mantenimiento": f"""
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header"><h2>🔧 Mantenimiento Pendiente</h2></div>
                <div class="content">
                    <p>El equipo <strong>{data.get('placa', 'N/A')}</strong> requiere mantenimiento.</p>
                    <ul>
                        <li>Equipo: {data.get('nombre_equipo', 'N/A')}</li>
                        <li>Fecha último mantenimiento: {data.get('ultimo_mantenimiento', 'Nunca')}</li>
                    </ul>
                    <p>Programa el mantenimiento lo antes posible.</p>
                </div>
                <div class="footer">Sistema de Mantenimiento</div>
            </div>
        </body>
        </html>
        """,
        
        "credenciales": f"""
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header"><h2>Bienvenido al Sistema ITAM</h2></div>
                <div class="content">
                    <p>Hola <strong>{data.get('nombre', 'usuario')}</strong>,</p>
                    <p>Se ha creado tu cuenta de acceso al sistema de inventarios.</p>
                    <p><strong>Usuario:</strong> {data.get('username', 'N/A')}<br>
                    <strong>Contraseña temporal:</strong> {data.get('password', 'N/A')}</p>
                    <p>Por favor, cambia tu contraseña después del primer ingreso.</p>
                    <a href="{data.get('login_url', '#')}" class="button">Iniciar sesión</a>
                </div>
                <div class="footer">Este mensaje es automático. No responder.</div>
            </div>
        </body>
        </html>
        """,
    }
    
    return templates.get(template_name, f"<p>Notificación del sistema</p><pre>{data}</pre>")