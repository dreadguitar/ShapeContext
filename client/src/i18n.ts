import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "dashboard": "Dashboard",
      "notes": "Notes",
      "settings": "Settings",
      "new_note": "New Note",
      "search": "Search...",
      "available_mcp": "Available for MCP",
      "category": "Category",
      "save": "Save",
      "theme": "Theme",
      "dark": "Dark",
      "light": "Light",
      "custom_theme": "Custom",
      "no_category": "No Category",
      "ai_configuration": "AI Configuration",
      "openai_api_key": "OpenAI API Key",
      "model": "Model",
      "base_url": "Base URL (For Ollama or LM Studio)",
      "appearance": "Appearance",
      "custom_colors": "Custom Colors",
      "language": "Language",
      "import_export": "Import / Export",
      "import_txt": "Import TXT",
      "export_all": "Export All",
      "save_settings": "Save Settings",
      "settings_saved": "Settings saved successfully.",
      "notes_imported": "Notes imported successfully.",
      "no_notes_open": "No note is open",
      "select_or_create_note": "Select a note from the sidebar or create a new one.",
      "no_notes": "No notes. Create your first note above.",
      "untitled": "Untitled",
      "draft": "Draft",
      "unsaved_draft": "Unsaved draft",
      "autosave_active": "Autosave active",
      "write_note_here": "Write your note here...",
      "note_title": "Note title...",
      "ask_assistant": "Ask the assistant...",
      "assistant_greeting": "Hi! I am your assistant. I can read your notes, create new ones, change settings, or even tweak the theme colors. Try me!",
      "executing_action": "Executing action:",
      "typing": "Typing...",
      "total_notes": "Total Notes",
      "mcp_notes": "Notes for MCP",
      "notes_by_category": "Notes by Category",
      "distribution": "Distribution",
      "assistant": "Assistant AI"
    }
  },
  es: {
    translation: {
      "dashboard": "Panel",
      "notes": "Notas",
      "settings": "Ajustes",
      "new_note": "Nueva Nota",
      "search": "Buscar...",
      "available_mcp": "Disponible para MCP",
      "category": "Categoría",
      "save": "Guardar",
      "theme": "Tema",
      "dark": "Oscuro",
      "light": "Claro",
      "custom_theme": "Personalizado (Custom)",
      "no_category": "Sin Categoría",
      "ai_configuration": "Configuración de IA",
      "openai_api_key": "OpenAI API Key",
      "model": "Modelo",
      "base_url": "Base URL (Para Ollama o LM Studio)",
      "appearance": "Apariencia",
      "custom_colors": "Colores Personalizados",
      "language": "Idioma / Language",
      "import_export": "Importar / Exportar",
      "import_txt": "Importar TXT",
      "export_all": "Exportar Todo",
      "save_settings": "Guardar Ajustes",
      "settings_saved": "Ajustes guardados correctamente.",
      "notes_imported": "Notas importadas.",
      "no_notes_open": "No hay ninguna nota abierta",
      "select_or_create_note": "Selecciona una nota del panel lateral o crea una nueva.",
      "no_notes": "No hay notas. Crea tu primera nota arriba.",
      "untitled": "Sin Título",
      "draft": "Borrador",
      "unsaved_draft": "Borrador sin guardar",
      "autosave_active": "Guardado automático activo",
      "write_note_here": "Escribe tu nota aquí...",
      "note_title": "Título de la nota...",
      "ask_assistant": "Pídele algo al asistente...",
      "assistant_greeting": "¡Hola! Soy tu asistente. Puedo leer tus notas, crear nuevas, cambiar configuraciones o hasta modificar los colores del tema. Pruébame.",
      "executing_action": "Ejecutando acción:",
      "typing": "Escribiendo...",
      "total_notes": "Total Notas",
      "mcp_notes": "Notas para MCP",
      "notes_by_category": "Notas por Categoría",
      "distribution": "Distribución",
      "assistant": "Asistente de IA"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "es", // default
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
