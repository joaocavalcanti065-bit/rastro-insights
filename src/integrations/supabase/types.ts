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
      alertas: {
        Row: {
          acao_sugerida: string | null
          ativo: boolean | null
          created_at: string
          empresa_id: string | null
          gravidade: string | null
          id: string
          mensagem: string
          pneu_id: string | null
          responsavel_id: string | null
          tipo_alerta: string
          tratado_em: string | null
          veiculo_id: string | null
        }
        Insert: {
          acao_sugerida?: string | null
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          gravidade?: string | null
          id?: string
          mensagem: string
          pneu_id?: string | null
          responsavel_id?: string | null
          tipo_alerta: string
          tratado_em?: string | null
          veiculo_id?: string | null
        }
        Update: {
          acao_sugerida?: string | null
          ativo?: boolean | null
          created_at?: string
          empresa_id?: string | null
          gravidade?: string | null
          id?: string
          mensagem?: string
          pneu_id?: string | null
          responsavel_id?: string | null
          tipo_alerta?: string
          tratado_em?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_pneu_id_fkey"
            columns: ["pneu_id"]
            isOneToOne: false
            referencedRelation: "pneus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      analises_ia: {
        Row: {
          conteudo: string
          created_at: string
          dados_entrada: Json | null
          empresa_id: string | null
          id: string
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          dados_entrada?: Json | null
          empresa_id?: string | null
          id?: string
          tipo: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          dados_entrada?: Json | null
          empresa_id?: string | null
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_ia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
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
      configuracoes: {
        Row: {
          chave: string
          created_at: string
          empresa_id: string | null
          id: string
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          condicao: string | null
          created_at: string
          custo_unitario: number | null
          destino_previsto: string | null
          empresa_id: string | null
          endereco_estoque: string | null
          id: string
          local_fisico: string | null
          pneu_id: string | null
          quantidade: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          condicao?: string | null
          created_at?: string
          custo_unitario?: number | null
          destino_previsto?: string | null
          empresa_id?: string | null
          endereco_estoque?: string | null
          id?: string
          local_fisico?: string | null
          pneu_id?: string | null
          quantidade?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          condicao?: string | null
          created_at?: string
          custo_unitario?: number | null
          destino_previsto?: string | null
          empresa_id?: string | null
          endereco_estoque?: string | null
          id?: string
          local_fisico?: string | null
          pneu_id?: string | null
          quantidade?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_pneu_id_fkey"
            columns: ["pneu_id"]
            isOneToOne: false
            referencedRelation: "pneus"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          contato: string | null
          created_at: string
          empresa_id: string | null
          id: string
          nome: string
          tipo: string | null
        }
        Insert: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome: string
          tipo?: string | null
        }
        Update: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          causa: string | null
          created_at: string
          custo: number | null
          empresa_id: string | null
          id: string
          km_no_momento: number | null
          observacoes: string | null
          ordem_servico: string | null
          pneu_id: string | null
          responsavel_id: string | null
          tipo: string
          veiculo_id: string | null
        }
        Insert: {
          causa?: string | null
          created_at?: string
          custo?: number | null
          empresa_id?: string | null
          id?: string
          km_no_momento?: number | null
          observacoes?: string | null
          ordem_servico?: string | null
          pneu_id?: string | null
          responsavel_id?: string | null
          tipo?: string
          veiculo_id?: string | null
        }
        Update: {
          causa?: string | null
          created_at?: string
          custo?: number | null
          empresa_id?: string | null
          id?: string
          km_no_momento?: number | null
          observacoes?: string | null
          ordem_servico?: string | null
          pneu_id?: string | null
          responsavel_id?: string | null
          tipo?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_pneu_id_fkey"
            columns: ["pneu_id"]
            isOneToOne: false
            referencedRelation: "pneus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_pneus: {
        Row: {
          created_at: string
          data_movimentacao: string
          destino: string | null
          empresa_id: string | null
          id: string
          km_no_momento: number | null
          observacoes: string | null
          origem: string | null
          pneu_id: string
          posicao_destino: string | null
          pressao_no_momento: number | null
          responsavel_id: string | null
          sulco_no_momento: number | null
          tipo_movimentacao: string
          veiculo_destino_id: string | null
          veiculo_origem_id: string | null
        }
        Insert: {
          created_at?: string
          data_movimentacao?: string
          destino?: string | null
          empresa_id?: string | null
          id?: string
          km_no_momento?: number | null
          observacoes?: string | null
          origem?: string | null
          pneu_id: string
          posicao_destino?: string | null
          pressao_no_momento?: number | null
          responsavel_id?: string | null
          sulco_no_momento?: number | null
          tipo_movimentacao: string
          veiculo_destino_id?: string | null
          veiculo_origem_id?: string | null
        }
        Update: {
          created_at?: string
          data_movimentacao?: string
          destino?: string | null
          empresa_id?: string | null
          id?: string
          km_no_momento?: number | null
          observacoes?: string | null
          origem?: string | null
          pneu_id?: string
          posicao_destino?: string | null
          pressao_no_momento?: number | null
          responsavel_id?: string | null
          sulco_no_momento?: number | null
          tipo_movimentacao?: string
          veiculo_destino_id?: string | null
          veiculo_origem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_pneus_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_pneus_pneu_id_fkey"
            columns: ["pneu_id"]
            isOneToOne: false
            referencedRelation: "pneus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_pneus_veiculo_destino_id_fkey"
            columns: ["veiculo_destino_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_pneus_veiculo_origem_id_fkey"
            columns: ["veiculo_origem_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pneus: {
        Row: {
          cliente_id: string
          created_at: string
          custo_acumulado: number | null
          custo_aquisicao: number | null
          data_aquisicao: string | null
          dot: string | null
          empresa_id: string | null
          fornecedor_recapagem_id: string | null
          fotos: Json | null
          id: string
          id_interno: string | null
          id_unico: string
          indice_carga: string | null
          km_atual: number | null
          km_inicial: number | null
          local_atual: string | null
          localizacao: string
          marca: string
          medida: string | null
          modelo_pneu: string | null
          numero_fogo: string | null
          numero_recapagens: number | null
          observacoes: string | null
          posicao_atual: string | null
          pressao_atual: number | null
          pressao_ideal: number | null
          qr_code: string | null
          qtd_recapagens: number | null
          status: string
          sulco_atual: number | null
          sulco_inicial: number | null
          tipo_aplicacao: string | null
          tipo_eixo: string | null
          tipo_pneu: string | null
          updated_at: string | null
          valor_aquisicao: number | null
          veiculo_id: string | null
          vida_atual: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          custo_acumulado?: number | null
          custo_aquisicao?: number | null
          data_aquisicao?: string | null
          dot?: string | null
          empresa_id?: string | null
          fornecedor_recapagem_id?: string | null
          fotos?: Json | null
          id?: string
          id_interno?: string | null
          id_unico: string
          indice_carga?: string | null
          km_atual?: number | null
          km_inicial?: number | null
          local_atual?: string | null
          localizacao?: string
          marca?: string
          medida?: string | null
          modelo_pneu?: string | null
          numero_fogo?: string | null
          numero_recapagens?: number | null
          observacoes?: string | null
          posicao_atual?: string | null
          pressao_atual?: number | null
          pressao_ideal?: number | null
          qr_code?: string | null
          qtd_recapagens?: number | null
          status?: string
          sulco_atual?: number | null
          sulco_inicial?: number | null
          tipo_aplicacao?: string | null
          tipo_eixo?: string | null
          tipo_pneu?: string | null
          updated_at?: string | null
          valor_aquisicao?: number | null
          veiculo_id?: string | null
          vida_atual?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          custo_acumulado?: number | null
          custo_aquisicao?: number | null
          data_aquisicao?: string | null
          dot?: string | null
          empresa_id?: string | null
          fornecedor_recapagem_id?: string | null
          fotos?: Json | null
          id?: string
          id_interno?: string | null
          id_unico?: string
          indice_carga?: string | null
          km_atual?: number | null
          km_inicial?: number | null
          local_atual?: string | null
          localizacao?: string
          marca?: string
          medida?: string | null
          modelo_pneu?: string | null
          numero_fogo?: string | null
          numero_recapagens?: number | null
          observacoes?: string | null
          posicao_atual?: string | null
          pressao_atual?: number | null
          pressao_ideal?: number | null
          qr_code?: string | null
          qtd_recapagens?: number | null
          status?: string
          sulco_atual?: number | null
          sulco_inicial?: number | null
          tipo_aplicacao?: string | null
          tipo_eixo?: string | null
          tipo_pneu?: string | null
          updated_at?: string | null
          valor_aquisicao?: number | null
          veiculo_id?: string | null
          vida_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pneus_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pneus_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pneus_fornecedor_recapagem_id_fkey"
            columns: ["fornecedor_recapagem_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pneus_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome_completo: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nome_completo?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome_completo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recapagens: {
        Row: {
          aprovada: boolean | null
          classificacao_carcaca: string | null
          created_at: string
          custo_recapagem: number | null
          data_envio: string | null
          data_retorno_real: string | null
          empresa_id: string | null
          fornecedor_id: string | null
          foto_antes: Json | null
          foto_depois: Json | null
          id: string
          motivo_reprovacao: string | null
          numero_ciclo: number | null
          observacoes: string | null
          pneu_id: string | null
          previsao_retorno: string | null
          status: string | null
        }
        Insert: {
          aprovada?: boolean | null
          classificacao_carcaca?: string | null
          created_at?: string
          custo_recapagem?: number | null
          data_envio?: string | null
          data_retorno_real?: string | null
          empresa_id?: string | null
          fornecedor_id?: string | null
          foto_antes?: Json | null
          foto_depois?: Json | null
          id?: string
          motivo_reprovacao?: string | null
          numero_ciclo?: number | null
          observacoes?: string | null
          pneu_id?: string | null
          previsao_retorno?: string | null
          status?: string | null
        }
        Update: {
          aprovada?: boolean | null
          classificacao_carcaca?: string | null
          created_at?: string
          custo_recapagem?: number | null
          data_envio?: string | null
          data_retorno_real?: string | null
          empresa_id?: string | null
          fornecedor_id?: string | null
          foto_antes?: Json | null
          foto_depois?: Json | null
          id?: string
          motivo_reprovacao?: string | null
          numero_ciclo?: number | null
          observacoes?: string | null
          pneu_id?: string | null
          previsao_retorno?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recapagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recapagens_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recapagens_pneu_id_fkey"
            columns: ["pneu_id"]
            isOneToOne: false
            referencedRelation: "pneus"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          categoria: string | null
          cliente_id: string
          created_at: string
          empresa_id_ref: string | null
          frota: string | null
          id: string
          km_medio_mensal: number | null
          marca: string | null
          modelo: string | null
          placa: string
          possui_estepe: boolean | null
          quantidade_eixos: number | null
          quantidade_estepes: number | null
          status: string | null
          tipo_veiculo: string | null
          total_pneus: number | null
          total_pneus_rodantes: number | null
        }
        Insert: {
          ano?: number | null
          categoria?: string | null
          cliente_id: string
          created_at?: string
          empresa_id_ref?: string | null
          frota?: string | null
          id?: string
          km_medio_mensal?: number | null
          marca?: string | null
          modelo?: string | null
          placa: string
          possui_estepe?: boolean | null
          quantidade_eixos?: number | null
          quantidade_estepes?: number | null
          status?: string | null
          tipo_veiculo?: string | null
          total_pneus?: number | null
          total_pneus_rodantes?: number | null
        }
        Update: {
          ano?: number | null
          categoria?: string | null
          cliente_id?: string
          created_at?: string
          empresa_id_ref?: string | null
          frota?: string | null
          id?: string
          km_medio_mensal?: number | null
          marca?: string | null
          modelo?: string | null
          placa?: string
          possui_estepe?: boolean | null
          quantidade_eixos?: number | null
          quantidade_estepes?: number | null
          status?: string | null
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
          {
            foreignKeyName: "veiculos_empresa_id_ref_fkey"
            columns: ["empresa_id_ref"]
            isOneToOne: false
            referencedRelation: "empresas"
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
