
export interface Client {
  id: string; // PK: client_01
  name: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  address?: string;
}

export interface User {
  id: string; // PK: user_admin_ama
  name: string;
  role: string; // Administrator, Engineer, Worker
  clientId: string; // FK to Client
}

export interface Contractor {
  id: string; // PK: cont_int_001 (maps from contractor_id in CSV)
  name: string;
  contactPerson?: string;
  address?: string;
  phone?: string;
  isInternal: boolean;
}

export interface Personnel {
  id: string; // PK: pers_op_gimenez
  name: string;
  role: string; // Operator, Engineer, ContractorFirm
  phone?: string;
  clientId: string; // FK to Client - indicates client this resource serves
  contractorId: string; // FK to Contractor
  availability?: 'disponible' | 'de licencia' | 'ocupado' | 'fuera de turno' | 'reunión' | string; // Added for common sense validation
}

export interface Machinery {
  id: string; // PK: mach_jd_7200
  name: string;
  type: string; // Tractor, Cosechadora
  model?: string;
  year?: number;
  clientId: string; // FK to Client - similar to personnel.clientId
  contractorId: string; // FK to Contractor
  status?: 'operativa' | 'en reparación' | 'mantenimiento' | 'fuera de servicio' | string; // Added for common sense validation
}

export interface Field {
  id: string; // PK: field_ama_01
  name: string;
  location?: string;
  clientId: string; // FK to Client
  area?: number; // hectares or other unit
}

export interface Lot {
  id: string; // PK: lot_ama_e_01
  name: string;
  fieldId: string; // FK to Field
  area?: number;
}

export interface Parcel {
  id: string; // PK: parcel_ama_e01_01
  name: string;
  lotId: string; // FK to Lot
  area?: number;
  crop?: string;
}

export interface Campaign {
  id: string; // PK: camp_soja2324_ama
  name: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  clientId: string; // FK to Client
  description?: string;
}

export interface TasksList { // Formerly TaskDefinition, from tasksList.csv
  id: string; // PK: task_siembra
  taskName: string; // Siembra Directa
  description?: string;
  category?: string; // Cultivo, Ganadería
}

export interface ProductInsume {
  id: string; // PK: prod_glifo_max
  name: string;
  type: string; // Herbicide, Seed, Fertilizer
  unit: string; // litro, kg, bolsa
}

export interface Task { // Formerly JobEvent, from tareas.csv
  id: string; // PK: task_entry_v5_001 (maps from task_entry_id in CSV)
  tasksListId: string; // FK to TasksList (task_id_ref in CSV)
  createdByUserId: string; // FK to User (created_by_user_id in CSV)
  clientId: string; // FK to Client (client_id in CSV)
  contractorId: string; // FK to Contractor (contractor_id in CSV)
  campaignId?: string; // FK to Campaign (campaign_id in CSV)
  fieldId?: string; // FK to Field (field_id in CSV)
  lotId?: string; // FK to Lot (lot_id in CSV)
  parcelId?: string; // FK to Parcel (parcel_id in CSV)
  startDateTime?: string; // TIMESTAMP as string
  endDateTime?: string; // TIMESTAMP as string
  durationHours?: number;
  status: string; // Programada, Finalizada (not an enum to allow flexibility)
  costEstimated?: number;
  costActual?: number;
  resultDescription?: string;
  notes?: string;
  creationTimestamp: string; // TIMESTAMP as string, NOT NULL
  additionalInfo?: string; // New field for additional task information
  // Properties below are transient for AI interaction, not part of DB schema for Task
  machineryIds?: string[]; 
  personnelIds?: string[];
  productInsumeDetails?: {id: string, quantityUsed: number, unitUsed: string}[];
}

export interface TaskMachineryLink { // from task_machineries_link.csv
  id: string; // PK: task_machinery_link_id
  taskId: string; // FK to Task (task_entry_id in CSV)
  machineryId: string; // FK to Machinery (machinery_id in CSV)
  hoursUsed?: number;
  notes?: string;
}

export interface TaskPersonnelLink { // from task_personnel_link.csv
  id: string; // PK: task_personnel_link_id
  taskId: string; // FK to Task (task_entry_id in CSV)
  personnelId: string; // FK to Personnel (personnel_id in CSV)
  roleInTask?: string;
  hoursWorked?: number;
}

export interface TaskInsumeLink { // from task_insumes_link.csv
  id: string; // PK: task_insume_link_id
  taskId: string; // FK to Task (task_entry_id in CSV)
  productInsumeId: string; // FK to ProductInsume (product_insume_id in CSV)
  quantityUsed: number;
  unitUsed: string; // Can be derived from product, but stored here for record
  applicationDetails?: string;
}

export interface UserAccess { // from user_access.csv
  id: string; // Synthesized PK for consistency, as CSV implies composite
  userId: string; // FK to User (user_id in CSV)
  fieldId: string; // FK to Field (campo_id in CSV)
  accessTotal: boolean; // acceso_total in CSV
}

export interface Database {
  clients: Client[];
  users: User[];
  contractors: Contractor[];
  personnel: Personnel[];
  machineries: Machinery[];
  fields: Field[];
  lots: Lot[];
  parcels: Parcel[];
  campaigns: Campaign[];
  tasksList: TasksList[]; // Renamed from taskDefinitions
  productsInsumes: ProductInsume[];
  tasks: Task[]; // Renamed from jobsEvents
  taskMachineryLinks: TaskMachineryLink[];
  taskPersonnelLinks: TaskPersonnelLink[];
  taskInsumeLinks: TaskInsumeLink[];
  userAccess: UserAccess[];
}

export type EntityType = keyof Database;

export const ALL_ENTITY_TYPES: EntityType[] = [
  'clients', 'users', 'contractors', 'personnel', 'machineries',
  'fields', 'lots', 'parcels', 'campaigns', 'tasksList',
  'productsInsumes', 'tasks', 'taskMachineryLinks',
  'taskPersonnelLinks', 'taskInsumeLinks', 'userAccess'
];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  groupedData?: GroupedResult[];
  rawLLMResponse?: string;
  relatedOfflineRequestId?: string; // Link to an offline request
  actionType?: LLMResponseAction['action']; // Added to identify AI action type
}

export interface GroupedResult {
  groupTitle: string;
  items: Record<string, any>[]; // Array of entities or aggregated data
  count?: number;
  entityType?: EntityType; // Optional: to help with specific CSV/PDF header mapping
}

export interface LLMResponseAction {
  action: 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY' | 'LIST_ENTITIES' | 
          'GROUPED_QUERY' | 'ANSWER_QUERY' | 'HELP' | 'ERROR' | 
          'PROPOSE_OPTIONS' | 'CONFIRM_CREATION' | 'TOGGLE_VOICE_MODE' |
          'PROMPT_CREATE_MISSING_ENTITY'; // New action
  entity?: EntityType; 
  data?: any | { enable?: boolean }; 
  query?: Record<string, any>; 
  messageForUser: string;
  groupedData?: GroupedResult[]; 
  rawResponse?: string;

  // For PROMPT_CREATE_MISSING_ENTITY
  entityToCreate?: EntityType; 
  suggestedData?: Partial<any>; 
  pendingTaskData?: Partial<Task>; 

  // For CREATE_ENTITY that creates a missing entity and needs to continue with a task
  followUpAction?: LLMResponseAction; 
}


// Types for Offline Request Queue
export type ErrorClassification =
  | 'NO_CONNECTION'
  | 'API_KEY_INVALID'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_UNAVAILABLE'
  | 'GEMINI_API_ERROR'
  | 'MAX_ATTEMPTS_REACHED'
  | 'UNKNOWN';

export interface OfflineRequestPayload {
  messageText: string;
  audioBase64?: string;
  audioMimeType?: string;
  // We will reconstruct context (DB state, recent messages) at the time of retry processing.
}

export interface ErrorInfoHistoryItem {
    timestamp: Date;
    type: ErrorClassification;
    message: string;
}
export interface OfflineRequestError {
    type: ErrorClassification;
    message: string;
    history?: ErrorInfoHistoryItem[];
}

export interface OfflineRequest {
  id: string;
  timestamp: Date; // When originally attempted by user / added to queue
  type: 'sendMessageToAI'; // For now, only this type
  payload: OfflineRequestPayload;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  attempts: number;
  lastAttemptTimestamp?: Date;
  errorInfo?: OfflineRequestError;
  originalMessageId?: string; // ID of the user's ChatMessage if it was displayed
}

// Type for mapping internal field keys to Spanish display names
export type FieldDisplayNames = Record<string, string>;
