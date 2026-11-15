// IDs accepted by the V3 settings API. Capacity varies by battery variant.
export default [
    ['AMPERA_E', 'Opel Ampera E'], ['BOLT_EV', 'Chevrolet Bolt'],
    ['ENYAQ_IV80', 'Škoda Enyaq iV80'], ['E_GOLF', 'VW e-Golf'],
    ['E_SOUL', 'Kia e-Soul'], ['E_UP', 'VW e-Up'],
    ['ID_3', 'VW ID.3'], ['ID_4', 'VW ID.4'], ['IONIQ_5', 'Hyundai IONIQ 5'],
    ['IONIQ_BEV', 'Hyundai IONIQ Electric'], ['IONIQ_FL_EV', 'Hyundai IONIQ Facelift Electric'],
    ['IONIQ_HEV', 'Hyundai IONIQ Hybrid'], ['IONIQ_PHEV', 'Hyundai IONIQ Plug-in Hybrid'],
    ['KONA_EV', 'Hyundai Kona EV'], ['NIRO_EV', 'Kia Niro EV'], ['SOUL_EV', 'Kia Soul EV'],
    ['ZOE_Q210', 'Renault Zoe Q210'], ['ZOE_ZE50', 'Renault Zoe ZE50']
].map(([value, text]) => ({ value, text }));
