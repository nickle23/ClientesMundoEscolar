// Variables para el modal de eliminación
let usuarioAEliminar = null;

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo} alert-dismissible fade show`;
    alert.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Crear nuevo usuario
document.addEventListener('DOMContentLoaded', function() {
    const formCrearUsuario = document.getElementById('form-crear-usuario');
    if (formCrearUsuario) {
        formCrearUsuario.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('btn-crear-usuario');
            const formData = new FormData(this);
            
            const usuarioData = {
                username: formData.get('username'),
                password: formData.get('password'),
                role: formData.get('role')
            };
            
            // Validaciones
            if (usuarioData.password.length < 6) {
                mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'danger');
                return;
            }
            
            btn.disabled = true;
            btn.innerHTML = '⏳ Creando...';
            
            try {
                const response = await fetch('/api/usuarios', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(usuarioData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    mostrarAlerta('✅ Usuario creado exitosamente', 'success');
                    this.reset();
                    // Recargar la página para mostrar el nuevo usuario
                    setTimeout(() => location.reload(), 1500);
                } else {
                    mostrarAlerta('❌ Error: ' + data.error, 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarAlerta('❌ Error de conexión', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '👥 Crear Usuario';
            }
        });
    }

    // Confirmar eliminación
    const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.addEventListener('click', async function() {
            if (!usuarioAEliminar) return;
            
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '⏳ Eliminando...';
            
            try {
                const response = await fetch(`/api/usuarios/${usuarioAEliminar}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    mostrarAlerta('✅ Usuario eliminado correctamente', 'success');
                    // Eliminar fila de la tabla
                    const filaUsuario = document.getElementById(`usuario-${usuarioAEliminar}`);
                    if (filaUsuario) {
                        filaUsuario.remove();
                    }
                    // Cerrar modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar'));
                    if (modal) {
                        modal.hide();
                    }
                } else {
                    mostrarAlerta('❌ Error: ' + data.error, 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarAlerta('❌ Error de conexión', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Sí, Eliminar';
                usuarioAEliminar = null;
            }
        });
    }
});

// Eliminar usuario
function eliminarUsuario(id, username) {
    usuarioAEliminar = id;
    const usuarioNombreElement = document.getElementById('usuario-eliminar-nombre');
    if (usuarioNombreElement) {
        usuarioNombreElement.textContent = username;
    }
    
    const modalElement = document.getElementById('modalConfirmarEliminar');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}