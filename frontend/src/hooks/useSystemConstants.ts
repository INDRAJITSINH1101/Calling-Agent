import { useQuery } from '@tanstack/react-query';
import { constantsApi, DEFAULT_SYSTEM_CONSTANTS, SystemConstants } from '../services/constantsApi';

export const useSystemConstants = () => {
  const { data = DEFAULT_SYSTEM_CONSTANTS, isLoading } = useQuery<SystemConstants>({
    queryKey: ['systemConstants'],
    queryFn: () => constantsApi.getAllConstants(),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
    refetchOnWindowFocus: false
  });

  return {
    constants: data,
    isLoading,
    consentStatuses: data.consent_statuses,
    leadStages: data.lead_stages,
    leadSources: data.lead_sources,
    scoreBuckets: data.score_buckets,
    ruleFieldTargets: data.rule_field_targets,
    ruleOperators: data.rule_operators,
    callingPersonas: data.calling_personas || DEFAULT_SYSTEM_CONSTANTS.calling_personas,
    sipProviders: data.sip_providers || DEFAULT_SYSTEM_CONSTANTS.sip_providers,
    sipTransports: data.sip_transports || DEFAULT_SYSTEM_CONSTANTS.sip_transports,
    phoneNumberTypes: data.phone_number_types || DEFAULT_SYSTEM_CONSTANTS.phone_number_types,
    routingFallbackActions: data.routing_fallback_actions || DEFAULT_SYSTEM_CONSTANTS.routing_fallback_actions,
    sipAudioCodecs: data.sip_audio_codecs || DEFAULT_SYSTEM_CONSTANTS.sip_audio_codecs,
    knowledgeDocumentTypes: data.knowledge_document_types || DEFAULT_SYSTEM_CONSTANTS.knowledge_document_types,
    knowledgeIngestionStatuses: data.knowledge_ingestion_statuses || DEFAULT_SYSTEM_CONSTANTS.knowledge_ingestion_statuses,
    guardrailActions: data.guardrail_actions || DEFAULT_SYSTEM_CONSTANTS.guardrail_actions,
    agentTones: data.agent_tones || DEFAULT_SYSTEM_CONSTANTS.agent_tones
  };
};
