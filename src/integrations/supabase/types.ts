export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          contato: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          contato?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          contato?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      coleta_manual_combustivel: {
        Row: {
          cliente_id: string
          consumo_km_por_litro: number | null
          created_at: string
          custo_por_km: number | null
          data_abastecimento: string
          id: string
          km_anterior: number | null
          km_atual: number
          km_rodado: number | null
          litros_abastecidos: number
          observacoes: string | null
          posto: string | null
          preco_litro: number | null
          status_eficiencia: string | null
          tipo_combustivel: string
          valor_total_pago: number
          veiculo_id: string
        }
        Insert: {
          cliente_id: string
          consumo_km_por_litro?: number | null
          created_at?: string
          custo_por_km?: number | null
          data_abastecimento?: string
          id?: string
          km_anterior?: number | null
          km_atual: number
          km_rodado?: number | null
          litros_abastecidos: number
          observacoes?: string | null
          posto?: string | null
          preco_litro?: number | null
          status_eficiencia?: string | null
          tipo_combustivel?: string
          valor_total_pago: number
          veiculo_id: string
        }
        Update: {
          cliente_id?: string
          consumo_km_por_litro?: number | null
          created_at?: string
          custo_por_km?: number | null
          data_abastecimento?: string
          id?: string
          km_anterior?: number | null
          km_atual?: number
          km_rodado?: number | null
          litros_abastecidos?: number
          observacoes?: string | null
          posto?: string | null
          preco_litro?: number | null
          status_eficiencia?: string | null
          tipo_combustivel?: string
          valor_total_pago?: number
          veiculo_id?: string
        }
        Relationships: []
      }
      coleta_manual_pneus: {
        Row: {
          cliente_id: string
          created_at: string
          data_medicao: string
          id: string
          km_anterior: number | null
          km_atual: number
          km_periodo: number | null
          km_por_mm: number | null
          observacoes: string | null
          posicao_pneu: string
          pressao_atual: number
          pressao_diferenca: number | null
          pressao_recomendada: number
          sulco_anterior: number | null
          sulco_atual: number
          sulco_variacao: number | null
          veiculo_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_medicao?: string
          id?: string
          km_anterior?: number | null
          km_atual: number
          km_periodo?: number | null
          km_por_mm?: number | null
          observacoes?: string | null
          posicao_pneu: string
          pressao_atual: number
          pressao_diferenca?: number | null
          pressao_recomendada?: number
          sulco_anterior?: number | null
          sulco_atual: number
          sulco_variacao?: number | null
          veiculo_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_medicao?: string
          id?: string
          km_anterior?: number | null
          km_atual?: number
          km_periodo?: number | null
          km_por_mm?: number | null
          observacoes?: string | null
          posicao_pneu?: string
          pressao_atual?: number
          pressao_diferenca?: number | null
          pressao_recomendada?: number
          sulco_anterior?: number | null
          sulco_atual?: number
          sulco_variacao?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coleta_manual_pneus_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coleta_manual_pneus_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          categoria: string | null
          cliente_id: string
          created_at: string
          id: string
          km_medio_mensal: number | null
          modelo: string | null
          placa: string
          possui_estepe: boolean | null
          quantidade_eixos: number | null
          quantidade_estepes: number | null
          tipo_veiculo: string | null
          total_pneus: number | null
          total_pneus_rodantes: number | null
        }
        Insert: {
          categoria?: string | null
          cliente_id: string
          created_at?: string
          id?: string
          km_medio_mensal?: number | null
          modelo?: string | null
          placa: string
          possui_estepe?: boolean | null
          quantidade_eixos?: number | null
          quantidade_estepes?: number | null
          tipo_veiculo?: string | null
          total_pneus?: number | null
          total_pneus_rodantes?: number | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: string
          created_at?: string
          id?: string
          km_medio_mensal?: number | null
          modelo?: string | null
          placa?: string
          possui_estepe?: boolean | null
          quantidade_eixos?: number | null
          quantidade_estepes?: number | null
          tipo_veiculo?: string | null
          total_pneus?: number | null
          total_pneus_rodantes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
