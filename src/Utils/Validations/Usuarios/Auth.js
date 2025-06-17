import { permisosModel, rolesModel, usuariosModel } from '../../../Models/AuthService/auth.model.js';

// Validaciones para el módulo de autenticación
export const authValidations = {
  // Validar datos de permiso
  validatePermisoData: (permisoData) => {
    const errors = [];
    
    if (!permisoData.NombrePermiso) {
      errors.push('El nombre del permiso es requerido');
    }
    
    if (permisoData.NombrePermiso && permisoData.NombrePermiso.length < 3) {
      errors.push('El nombre del permiso debe tener al menos 3 caracteres');
    }
    
    if (permisoData.NombrePermiso && permisoData.NombrePermiso.length > 100) {
      errors.push('El nombre del permiso no puede exceder 100 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? errors.join(', ') : null
    };
  },

  // Validar que un permiso existe
  validatePermisoExists: async (id) => {
    try {
      const permiso = await permisosModel.getById(id);
      return {
        isValid: !!permiso,
        permiso,
        message: permiso ? null : 'Permiso no encontrado'
      };
    } catch (error) {
      return {
        isValid: false,
        permiso: null,
        message: 'Error al verificar permiso',
        error: error.message
      };
    }
  },

  // Validar datos de rol
  validateRolData: (rolData) => {
    const errors = [];
    
    if (!rolData.NombreRol) {
      errors.push('El nombre del rol es requerido');
    }
    
    if (rolData.NombreRol && rolData.NombreRol.length < 3) {
      errors.push('El nombre del rol debe tener al menos 3 caracteres');
    }
    
    if (rolData.NombreRol && rolData.NombreRol.length > 100) {
      errors.push('El nombre del rol no puede exceder 100 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? errors.join(', ') : null
    };
  },

  // Validar que un rol existe
  validateRolExists: async (id) => {
    try {
      const rol = await rolesModel.getById(id);
      return {
        isValid: !!rol,
        rol,
        message: rol ? null : 'Rol no encontrado'
      };
    } catch (error) {
      return {
        isValid: false,
        rol: null,
        message: 'Error al verificar rol',
        error: error.message
      };
    }
  },

  // Validar estado
  validateEstado: (estado) => {
    if (estado === undefined || estado === null) {
      return {
        isValid: false,
        message: 'El estado es requerido'
      };
    }
    
    if (typeof estado !== 'boolean') {
      return {
        isValid: false,
        message: 'El estado debe ser verdadero o falso'
      };
    }
    
    return {
      isValid: true,
      message: null
    };
  },

  // Validar datos de usuario
  validateUsuarioData: (usuarioData, isUpdate = false) => {
    const errors = [];
    
    if (!isUpdate || usuarioData.Nombre !== undefined) {
      if (!usuarioData.Nombre) {
        errors.push('El nombre es requerido');
      } else if (usuarioData.Nombre.length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
      } else if (usuarioData.Nombre.length > 100) {
        errors.push('El nombre no puede exceder 100 caracteres');
      }
    }
    
    if (!isUpdate || usuarioData.Apellido !== undefined) {
      if (!usuarioData.Apellido) {
        errors.push('El apellido es requerido');
      } else if (usuarioData.Apellido.length < 2) {
        errors.push('El apellido debe tener al menos 2 caracteres');
      } else if (usuarioData.Apellido.length > 100) {
        errors.push('El apellido no puede exceder 100 caracteres');
      }
    }
    
    if (!isUpdate || usuarioData.Correo !== undefined) {
      if (!usuarioData.Correo) {
        errors.push('El correo es requerido');
      } else if (!authValidations.validateEmailFormat(usuarioData.Correo).isValid) {
        errors.push('El formato del correo es inválido');
      }
    }
    
    if (!isUpdate || usuarioData.Documento !== undefined) {
      if (!usuarioData.Documento) {
        errors.push('El documento es requerido');
      } else if (!authValidations.validateDocumentoFormat(usuarioData.Documento).isValid) {
        errors.push('El formato del documento es inválido');
      }
    }
    
    if (!isUpdate || usuarioData.IdRol !== undefined) {
      if (!usuarioData.IdRol) {
        errors.push('El rol es requerido');
      }
    }
    
    if (usuarioData.Telefono && !authValidations.validateTelefonoFormat(usuarioData.Telefono).isValid) {
      errors.push('El formato del teléfono es inválido');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? errors.join(', ') : null
    };
  },

  // Validar que un usuario existe
  validateUsuarioExists: async (id) => {
    try {
      const usuario = await usuariosModel.getById(id);
      return {
        isValid: !!usuario,
        usuario,
        message: usuario ? null : 'Usuario no encontrado'
      };
    } catch (error) {
      return {
        isValid: false,
        usuario: null,
        message: 'Error al verificar usuario',
        error: error.message
      };
    }
  },

  // Validar formato de correo electrónico
  validateEmailFormat: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(email),
      message: emailRegex.test(email) ? null : 'Formato de correo inválido'
    };
  },

  // Validar formato de documento
  validateDocumentoFormat: (documento) => {
    // Acepta números de 6 a 20 dígitos
    const documentoRegex = /^\d{6,20}$/;
    return {
      isValid: documentoRegex.test(documento),
      message: documentoRegex.test(documento) ? null : 'El documento debe contener entre 6 y 20 dígitos'
    };
  },

  // Validar formato de teléfono
  validateTelefonoFormat: (telefono) => {
    // Acepta números con o sin espacios, guiones o paréntesis
    const telefonoRegex = /^[\d\s\-$$$$\+]{7,15}$/;
    return {
      isValid: telefonoRegex.test(telefono),
      message: telefonoRegex.test(telefono) ? null : 'Formato de teléfono inválido'
    };
  },

  // Validar contraseña
  validatePassword: (password) => {
    const errors = [];
    
    if (!password) {
      errors.push('La contraseña es requerida');
      return {
        isValid: false,
        errors,
        message: 'La contraseña es requerida'
      };
    }
    
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    
    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? errors.join(', ') : null
    };
  },

  // Validar credenciales de login
  validateLoginCredentials: (correo, password) => {
    const errors = [];
    
    if (!correo) {
      errors.push('El correo es requerido');
    } else if (!authValidations.validateEmailFormat(correo).isValid) {
      errors.push('Formato de correo inválido');
    }
    
    if (!password) {
      errors.push('La contraseña es requerida');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? errors.join(', ') : null
    };
  },

  // Validar parámetros de búsqueda
  validateSearchParams: (searchTerm) => {
    if (!searchTerm) {
      return {
        isValid: false,
        message: 'El término de búsqueda es requerido'
      };
    }
    
    if (searchTerm.length < 2) {
      return {
        isValid: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      };
    }
    
    return {
      isValid: true,
      message: null
    };
  },

  // Validar array de permisos
  validatePermisosArray: (permisos) => {
    if (!permisos || !Array.isArray(permisos)) {
      return {
        isValid: false,
        message: 'Se requiere un array de IDs de permisos'
      };
    }
    
    if (permisos.length === 0) {
      return {
        isValid: false,
        message: 'Debe proporcionar al menos un permiso'
      };
    }
    
    // Verificar que todos los elementos sean números
    const invalidIds = permisos.filter(id => !Number.isInteger(Number(id)) || Number(id) <= 0);
    if (invalidIds.length > 0) {
      return {
        isValid: false,
        message: 'Todos los IDs de permisos deben ser números enteros positivos'
      };
    }
    
    return {
      isValid: true,
      message: null
    };
  }
};

// Reglas de negocio para autenticación
export const authBusinessRules = {
  // Verificar si se puede eliminar un rol
  canDeleteRol: (rolId) => {
    // No permitir eliminar el rol de Super Administrador
    if (parseInt(rolId) === 1) {
      return {
        canDelete: false,
        message: 'No se puede eliminar el rol de Super Administrador'
      };
    }
    
    return {
      canDelete: true,
      message: null
    };
  },

  // Verificar si se puede desactivar un rol
  canDeactivateRol: (rolId, estado) => {
    // No permitir desactivar el rol de Super Administrador
    if (parseInt(rolId) === 1 && estado === false) {
      return {
        canDeactivate: false,
        message: 'No se puede desactivar el rol de Super Administrador'
      };
    }
    
    return {
      canDeactivate: true,
      message: null
    };
  },

  // Verificar si se puede eliminar un usuario
  canDeleteUsuario: (usuario) => {
    // No permitir eliminar al Super Administrador
    if (usuario.IdRol === 1) {
      return {
        canDelete: false,
        message: 'No se puede eliminar al Super Administrador'
      };
    }
    
    return {
      canDelete: true,
      message: null
    };
  },

  // Verificar si se puede desactivar un usuario
  canDeactivateUsuario: (usuario, estado) => {
    // No permitir desactivar al Super Administrador
    if (usuario.IdRol === 1 && estado === false) {
      return {
        canDeactivate: false,
        message: 'No se puede desactivar al Super Administrador'
      };
    }
    
    return {
      canDeactivate: true,
      message: null
    };
  },

  // Verificar si se pueden modificar permisos de un rol
  canModifyRolPermisos: (rolId) => {
    // No permitir modificar permisos del Super Administrador
    if (parseInt(rolId) === 1) {
      return {
        canModify: false,
        message: 'No se pueden modificar los permisos del rol Super Administrador'
      };
    }
    
    return {
      canModify: true,
      message: null
    };
  },

  // Verificar si se puede eliminar un permiso de un rol
  canRemovePermisoFromRol: (rolId) => {
    // No permitir eliminar permisos del Super Administrador
    if (parseInt(rolId) === 1) {
      return {
        canRemove: false,
        message: 'No se pueden eliminar permisos del rol Super Administrador'
      };
    }
    
    return {
      canRemove: true,
      message: null
    };
  },

  // Determinar si debe enviar contraseña temporal
  shouldSendTempPassword: (sendTempPassword, providedPassword) => {
    return sendTempPassword !== false || !providedPassword;
  },

  // Verificar si un usuario puede cambiar su propia contraseña
  canChangeOwnPassword: (userId, targetUserId) => {
    return parseInt(userId) === parseInt(targetUserId);
  }
};