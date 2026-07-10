/**
 * Tipos de la base de datos — schema aislado `atrio_agenda`.
 *
 * Se mantienen a mano (no se usa `supabase gen types`) a propósito: así el repo
 * de HQ de Atrio nunca arrastra el esquema de wepairr (schema `public`) ni el de
 * `jardin`. La forma respeta lo que espera supabase-js para tipar `.from()`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = { created_at: string };

export interface Database {
  atrio_agenda: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          name: string;
          role: string | null;
          avatar_url: string | null;
          accent_color: string;
          emoji: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          name: string;
          role?: string | null;
          avatar_url?: string | null;
          accent_color?: string;
          emoji?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          color: string | null;
          client_name: string | null;
          description: string | null;
          archived: boolean;
          sort_order: number;
          created_by: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          emoji?: string;
          color?: string | null;
          client_name?: string | null;
          description?: string | null;
          archived?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      sections: {
        Row: {
          id: string;
          project_id: string | null;
          name: string;
          sort_order: number;
        };
        Insert: { id?: string; project_id?: string | null; name: string; sort_order?: number };
        Update: Partial<Database["atrio_agenda"]["Tables"]["sections"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          section_id: string | null;
          parent_task_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          assignee_id: string | null;
          due_date: string | null;
          start_date: string | null;
          completed_at: string | null;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          section_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          assignee_id?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      tags: {
        Row: { id: string; name: string; color: string };
        Insert: { id?: string; name: string; color?: string };
        Update: Partial<Database["atrio_agenda"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      task_tags: {
        Row: { task_id: string; tag_id: string };
        Insert: { task_id: string; tag_id: string };
        Update: Partial<{ task_id: string; tag_id: string }>;
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          kind: string;
          project_id: string | null;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          emoji?: string;
          kind?: string;
          project_id?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["channels"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          channel_id: string | null;
          parent_message_id: string | null;
          author_id: string | null;
          body: string | null;
          content: Json | null;
          pinned: boolean;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          channel_id?: string | null;
          parent_message_id?: string | null;
          author_id?: string | null;
          body?: string | null;
          content?: Json | null;
          pinned?: boolean;
          created_at?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      reactions: {
        Row: {
          id: string;
          message_id: string | null;
          profile_id: string | null;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id?: string | null;
          profile_id?: string | null;
          emoji: string;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["reactions"]["Insert"]>;
        Relationships: [];
      };
      channel_reads: {
        Row: { channel_id: string; profile_id: string; last_read_at: string };
        Insert: { channel_id: string; profile_id: string; last_read_at?: string };
        Update: Partial<{ channel_id: string; profile_id: string; last_read_at: string }>;
        Relationships: [];
      };
      docs: {
        Row: {
          id: string;
          parent_doc_id: string | null;
          project_id: string | null;
          title: string;
          icon: string;
          cover_url: string | null;
          content: Json | null;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_doc_id?: string | null;
          project_id?: string | null;
          title?: string;
          icon?: string;
          cover_url?: string | null;
          content?: Json | null;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["docs"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          target_type: string;
          target_id: string;
          block_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: string;
          target_id: string;
          block_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["comments"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          all_day: boolean;
          project_id: string | null;
          color: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          all_day?: boolean;
          project_id?: string | null;
          color?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string | null;
          actor_id: string | null;
          type: string;
          title: string | null;
          body: string | null;
          target_type: string | null;
          target_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id?: string | null;
          actor_id?: string | null;
          type: string;
          title?: string | null;
          body?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      activity: {
        Row: {
          id: string;
          actor_id: string | null;
          verb: string;
          target_type: string | null;
          target_id: string | null;
          project_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          verb: string;
          target_type?: string | null;
          target_id?: string | null;
          project_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["atrio_agenda"]["Tables"]["activity"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

/* ---------- alias de conveniencia ---------- */
type T = Database["atrio_agenda"]["Tables"];

export type Profile = T["profiles"]["Row"];
export type Project = T["projects"]["Row"];
export type Section = T["sections"]["Row"];
export type Task = T["tasks"]["Row"];
export type Tag = T["tags"]["Row"];
export type Channel = T["channels"]["Row"];
export type Message = T["messages"]["Row"];
export type Reaction = T["reactions"]["Row"];
export type ChannelRead = T["channel_reads"]["Row"];
export type Doc = T["docs"]["Row"];
export type Comment = T["comments"]["Row"];
export type CalEvent = T["events"]["Row"];
export type Notification = T["notifications"]["Row"];
export type Activity = T["activity"]["Row"];

export type TaskInsert = T["tasks"]["Insert"];
export type TaskUpdate = T["tasks"]["Update"];
export type ProjectInsert = T["projects"]["Insert"];
export type DocInsert = T["docs"]["Insert"];
export type MessageInsert = T["messages"]["Insert"];
