import React, { useState } from 'react';
import { X, Compass, ArrowRight, Shield, Award, Sparkles, MapPin } from 'lucide-react';
import { EcosystemEntity } from '../types';

interface DiscoveryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: EcosystemEntity[];
  onSelectAndCenterEntity: (entity: EcosystemEntity) => void;
}

interface QuestStep {
  id: string;
  quadrant: string;
  title: string;
  subtitle: string;
  entityName: string;
  description: string;
  badgeColor: string;
}

export const DiscoveryModeModal: React.FC<DiscoveryModeModalProps> = ({
  isOpen,
  onClose,
  entities,
  onSelectAndCenterEntity
}) => {
  if (!isOpen) return null;

  const questSteps: QuestStep[] = [
    {
      id: 'q1',
      quadrant: 'Inner Change',
      title: 'Quest I: The Inner Sanctuary',
      subtitle: 'Contemplative Science & Trauma Integration',
      entityName: 'Mind & Life Institute',
      description: 'Explore how internal grounding, somatic capacity, and contemplative science build the psychological stamina needed for systemic change.',
      badgeColor: '#5B21B6'
    },
    {
      id: 'q2',
      quadrant: 'Social Change',
      title: 'Quest II: The Agora of Commons',
      subtitle: 'Civic Cooperation & Participatory Action',
      entityName: 'Transition Network',
      description: 'Journey to local community resilience hubs, worker-owned cooperatives, and citizens assemblies forging democratic governance.',
      badgeColor: '#111827'
    },
    {
      id: 'q3',
      quadrant: 'Cultural Change',
      title: 'Quest III: The Loom of Mythos',
      subtitle: 'Transcontextual Thinking & Ecological Narratives',
      entityName: 'International Bateson Institute',
      description: 'Uncover Warm Data, mythopoetic storytelling, and indigenous pattern thinking shifting worldviews beyond human exceptionalism.',
      badgeColor: '#7D8764'
    },
    {
      id: 'q4',
      quadrant: 'Systems Change',
      title: 'Quest IV: The Systems Nexus',
      subtitle: 'Doughnut Economics & Planetary Boundaries',
      entityName: 'Doughnut Economics Action Lab (DEAL)',
      description: 'Examine macroeconomic redesign, leverage points, resilience science, and bioregional architecture transforming global infrastructure.',
      badgeColor: '#4FC1E0'
    },
    {
      id: 'q5',
      quadrant: 'Ecotones (Intersections) & Synthesis',
      title: 'Quest V: Ecotones (Intersections)',
      subtitle: 'Diagonal Spines & Transdisciplinary Nexus',
      entityName: 'Santa Fe Institute',
      description: 'Explore the ecotones (intersections) where inner consciousness, social commons, cultural worldviews, and complex systems cross-pollinate.',
      badgeColor: '#059669'
    }
  ];

  const handleEmbark = (entityName: string) => {
    const target = entities.find(e => e.name.toLowerCase().includes(entityName.toLowerCase()));
    if (target) {
      onSelectAndCenterEntity(target);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-[#5B21B6]" />
            <h2 className="font-editorial text-xl font-semibold text-[#111827]">
              Ecosystem Discovery Quests
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8C877F] hover:text-[#111827] rounded-[4px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
            Take a guided journey through the four cardinal quadrants of transformative work. Embarking on a quest automatically teleports the map camera to key cornerstone institutions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questSteps.map(quest => (
              <div
                key={quest.id}
                className="p-4 bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="px-2 py-0.5 text-[9px] font-technical uppercase font-semibold text-white rounded-[2px]"
                      style={{ backgroundColor: quest.badgeColor }}
                    >
                      {quest.quadrant}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[#D9C01B] fill-[#D9C01B]" />
                  </div>

                  <h3 className="font-editorial text-lg font-semibold text-[#111827] mt-1">
                    {quest.title}
                  </h3>
                  <div className="font-technical text-[10px] text-[#8C877F] mb-2">
                    {quest.subtitle}
                  </div>

                  <p className="font-sans text-xs text-[#4B5563] leading-relaxed mb-3">
                    {quest.description}
                  </p>
                </div>

                <button
                  onClick={() => handleEmbark(quest.entityName)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white group-hover:bg-[#111827] text-[#111827] group-hover:text-white border border-[#E5E7EB] rounded-[4px] text-xs font-sans transition-all"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#4FC1E0]" />
                  <span>Teleport to {quest.entityName}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E7EB] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E5E7EB] bg-white text-[#111827] text-xs font-sans rounded-[4px] hover:bg-[#FAF8F5]"
          >
            Close Guided Quests
          </button>
        </div>
      </div>
    </div>
  );
};
