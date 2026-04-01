/**
 * Bairros populares por destino com informações de vibe, preço e perfil.
 * Chave: nome da cidade em português.
 * Todas as informações em português brasileiro.
 */

export interface DestinationNeighborhood {
  name: string;
  vibe: string;
  priceRange: string;
  description: string;
  bestFor: string;
}

export const DESTINATION_NEIGHBORHOODS: Record<string, DestinationNeighborhood[]> = {
  // ===== BRASIL =====
  'Rio de Janeiro': [
    { name: 'Ipanema', vibe: 'Sofisticado', priceRange: 'R$$$', description: 'Praia icônica, restaurantes descolados e vida noturna refinada.', bestFor: 'Casais' },
    { name: 'Copacabana', vibe: 'Clássico', priceRange: 'R$$', description: 'Orla lendária com muita opção de hotel e fácil acesso ao metrô.', bestFor: 'Primeira viagem ao Rio' },
    { name: 'Santa Teresa', vibe: 'Boêmio', priceRange: 'R$$', description: 'Bairro artístico nas ladeiras com ateliês, bares e vista da cidade.', bestFor: 'Mochileiros e artistas' },
    { name: 'Botafogo', vibe: 'Moderno', priceRange: 'R$$', description: 'Cena gastronômica em ascensão, perto do Pão de Açúcar e com vibe jovem.', bestFor: 'Jovens e foodies' },
  ],
  'São Paulo': [
    { name: 'Vila Madalena', vibe: 'Boêmio', priceRange: 'R$$', description: 'Grafites, bares, galerias e vida noturna alternativa.', bestFor: 'Jovens e vida noturna' },
    { name: 'Jardins', vibe: 'Sofisticado', priceRange: 'R$$$', description: 'Bairro nobre com os melhores restaurantes e lojas de grife.', bestFor: 'Casais e compras' },
    { name: 'Liberdade', vibe: 'Cultural', priceRange: 'R$', description: 'Bairro oriental com a melhor comida asiática e feira de domingo.', bestFor: 'Foodies e cultura' },
    { name: 'Pinheiros', vibe: 'Descolado', priceRange: 'R$$', description: 'Restaurantes premiados, feiras orgânicas e vida cultural intensa.', bestFor: 'Casais e foodies' },
  ],
  'Florianópolis': [
    { name: 'Lagoa da Conceição', vibe: 'Animado', priceRange: 'R$$', description: 'Centro social da ilha com restaurantes, bares e esportes aquáticos.', bestFor: 'Jovens e vida noturna' },
    { name: 'Jurerê', vibe: 'Luxuoso', priceRange: 'R$$$', description: 'Beach clubs, casas de veraneio de alto padrão e festas badaladas.', bestFor: 'Festas e luxo' },
    { name: 'Campeche', vibe: 'Alternativo', priceRange: 'R$', description: 'Praia tranquila no sul da ilha com clima surfista e rústico.', bestFor: 'Mochileiros e surfistas' },
    { name: 'Santo Antônio de Lisboa', vibe: 'Tradicional', priceRange: 'R$$', description: 'Vilarejo açoriano com restaurantes de frutos do mar e pôr do sol lindo.', bestFor: 'Casais e famílias' },
  ],
  'Salvador': [
    { name: 'Pelourinho', vibe: 'Histórico', priceRange: 'R$', description: 'Centro histórico colonial com igrejas, música e cultura afro-baiana.', bestFor: 'Cultura e história' },
    { name: 'Rio Vermelho', vibe: 'Boêmio', priceRange: 'R$$', description: 'Bairro de bares, acarajé famoso e vida noturna animada.', bestFor: 'Jovens e vida noturna' },
    { name: 'Barra', vibe: 'Turístico', priceRange: 'R$$', description: 'Farol da Barra, praia, calçadão e boa infraestrutura hoteleira.', bestFor: 'Primeira viagem a Salvador' },
  ],
  'Gramado': [
    { name: 'Centro (Rua Coberta)', vibe: 'Charmoso', priceRange: 'R$$$', description: 'Coração de Gramado com chocolaterias, lojas e restaurantes a pé.', bestFor: 'Casais' },
    { name: 'Lago Negro', vibe: 'Tranquilo', priceRange: 'R$$', description: 'Área residencial perto do lago, pousadas aconchegantes e silêncio.', bestFor: 'Famílias e relaxamento' },
    { name: 'Canela (vizinha)', vibe: 'Aventureiro', priceRange: 'R$', description: 'Mais barata que Gramado com acesso à Cascata do Caracol e parques.', bestFor: 'Famílias e aventura' },
  ],
  'Foz do Iguaçu': [
    { name: 'Centro', vibe: 'Prático', priceRange: 'R$', description: 'Hotéis acessíveis, restaurantes e fácil acesso às atrações.', bestFor: 'Mochileiros' },
    { name: 'Av. das Cataratas', vibe: 'Turístico', priceRange: 'R$$$', description: 'Resorts e hotéis de luxo no caminho das Cataratas.', bestFor: 'Casais e famílias' },
    { name: 'Vila A', vibe: 'Local', priceRange: 'R$', description: 'Bairro residencial com restaurantes autênticos e preços justos.', bestFor: 'Economia' },
  ],
  'Natal': [
    { name: 'Ponta Negra', vibe: 'Turístico', priceRange: 'R$$', description: 'Principal bairro turístico com Morro do Careca, bares e restaurantes.', bestFor: 'Primeira viagem a Natal' },
    { name: 'Pipa', vibe: 'Boêmio', priceRange: 'R$$', description: 'Vila praiana charmosa a 1h30 com golfinhos, falésias e noite animada.', bestFor: 'Jovens e casais' },
    { name: 'Via Costeira', vibe: 'Resort', priceRange: 'R$$$', description: 'Faixa de resorts entre dunas e mar com estrutura completa.', bestFor: 'Famílias e relaxamento' },
  ],
  'Fortaleza': [
    { name: 'Meireles/Iracema', vibe: 'Central', priceRange: 'R$$', description: 'Orla turística com calçadão, feirinha noturna e boa infraestrutura.', bestFor: 'Primeira viagem' },
    { name: 'Praia do Futuro', vibe: 'Animado', priceRange: 'R$', description: 'Barracas de praia com mega estrutura, shows e frutos do mar.', bestFor: 'Famílias e grupos' },
    { name: 'Cumbuco', vibe: 'Esportivo', priceRange: 'R$$', description: 'Vila de kitesurf a 30min, pousadas charmosas e lagoas.', bestFor: 'Aventureiros e kitesurfistas' },
  ],
  'Recife': [
    { name: 'Boa Viagem', vibe: 'Turístico', priceRange: 'R$$', description: 'Praia urbana com hotéis, shoppings e restaurantes. Base prática.', bestFor: 'Primeira viagem' },
    { name: 'Recife Antigo', vibe: 'Cultural', priceRange: 'R$$', description: 'Centro histórico revitalizado com museus, bares e polo gastronômico.', bestFor: 'Cultura e história' },
    { name: 'Olinda', vibe: 'Artístico', priceRange: 'R$', description: 'Patrimônio UNESCO com ladeiras coloridas, ateliês e pousadas.', bestFor: 'Mochileiros e artistas' },
  ],
  'Jericoacoara': [
    { name: 'Vila (centro)', vibe: 'Rústico', priceRange: 'R$$', description: 'Ruas de areia, pousadas charmosas, restaurantes e forró à noite.', bestFor: 'Todos' },
    { name: 'Preá', vibe: 'Esportivo', priceRange: 'R$', description: 'Vila vizinha focada em kitesurf, mais tranquila e autêntica.', bestFor: 'Kitesurfistas' },
    { name: 'Pousadas de luxo (arredores)', vibe: 'Exclusivo', priceRange: 'R$$$', description: 'Pousadas boutique afastadas da vila com piscina e isolamento.', bestFor: 'Casais e lua de mel' },
  ],
  'Bonito': [
    { name: 'Centro de Bonito', vibe: 'Prático', priceRange: 'R$$', description: 'Cidade pequena com agências, restaurantes e pousadas a pé.', bestFor: 'Todos' },
    { name: 'Fazendas/hotéis rurais', vibe: 'Rústico', priceRange: 'R$$$', description: 'Perto das atrações, contato com natureza e café colonial.', bestFor: 'Famílias e casais' },
    { name: 'Bodoquena (vizinha)', vibe: 'Alternativo', priceRange: 'R$', description: 'Menos turístico com cachoeiras e atrações mais baratas.', bestFor: 'Mochileiros' },
  ],
  'Campos do Jordão': [
    { name: 'Vila Capivari', vibe: 'Charmoso', priceRange: 'R$$$', description: 'Centro turístico com restaurantes, lojas e chocolate quente.', bestFor: 'Casais' },
    { name: 'Vila Abernéssia', vibe: 'Local', priceRange: 'R$', description: 'Centro real da cidade com comércio local e preços mais acessíveis.', bestFor: 'Economia' },
    { name: 'Alto da Vila Inglesa', vibe: 'Exclusivo', priceRange: 'R$$$', description: 'Pousadas e hotéis de alto padrão com vista da serra.', bestFor: 'Lua de mel e luxo' },
  ],
  'Paraty': [
    { name: 'Centro Histórico', vibe: 'Colonial', priceRange: 'R$$', description: 'Casarões históricos, ruas de pedra, ateliês e restaurantes charmosos.', bestFor: 'Casais e cultura' },
    { name: 'Trindade', vibe: 'Alternativo', priceRange: 'R$', description: 'Vila caiçara com praias selvagens, hostels e clima mochileiro.', bestFor: 'Mochileiros e jovens' },
    { name: 'Praia do Jabaquara', vibe: 'Tranquilo', priceRange: 'R$$', description: 'Pousadas à beira-mar afastadas do centro com tranquilidade.', bestFor: 'Famílias' },
  ],
  'Búzios': [
    { name: 'Rua das Pedras', vibe: 'Animado', priceRange: 'R$$$', description: 'Centro gastronômico e de vida noturna, lojas e bares.', bestFor: 'Casais e vida noturna' },
    { name: 'Geribá', vibe: 'Esportivo', priceRange: 'R$$', description: 'Praia de surf com pousadas próximas e vibe jovem.', bestFor: 'Jovens e surfistas' },
    { name: 'João Fernandes', vibe: 'Familiar', priceRange: 'R$$', description: 'Praia calma com águas transparentes e pousadas tranquilas.', bestFor: 'Famílias e casais' },
  ],
  'Fernando de Noronha': [
    { name: 'Vila dos Remédios', vibe: 'Central', priceRange: 'R$$', description: 'Centro da ilha com pousadas, restaurantes e infraestrutura básica.', bestFor: 'Todos' },
    { name: 'Floresta Velha', vibe: 'Tranquilo', priceRange: 'R$$$', description: 'Pousadas mais isoladas e charmosas no interior da ilha.', bestFor: 'Casais e lua de mel' },
    { name: 'Boldró', vibe: 'Vista', priceRange: 'R$$$', description: 'Perto do mirante dos Dois Irmãos e da Praia do Boldró.', bestFor: 'Fotógrafos e casais' },
  ],

  // ===== AMÉRICA DO SUL =====
  'Buenos Aires': [
    { name: 'Palermo Soho', vibe: 'Descolado', priceRange: '$$', description: 'Bares, restaurantes, lojas de design e grafites. Melhor bairro pra ficar.', bestFor: 'Jovens e casais' },
    { name: 'Recoleta', vibe: 'Elegante', priceRange: '$$$', description: 'Bairro nobre com museus, cafés clássicos e o famoso cemitério.', bestFor: 'Casais e cultura' },
    { name: 'San Telmo', vibe: 'Boêmio', priceRange: '$', description: 'Antiguidades, tango na rua e feira de domingo lendária.', bestFor: 'Mochileiros e cultura' },
    { name: 'Puerto Madero', vibe: 'Moderno', priceRange: '$$$', description: 'Docks renovados com restaurantes à beira d\'água e prédios modernos.', bestFor: 'Luxo e jantares' },
  ],
  'Santiago': [
    { name: 'Providencia', vibe: 'Moderno', priceRange: '$$', description: 'Bairro seguro e bem conectado com metrô, cafés e boa vida noturna.', bestFor: 'Primeira viagem' },
    { name: 'Lastarria', vibe: 'Boêmio', priceRange: '$$', description: 'Bairro cultural com cafés, galerias e ruas charmosas.', bestFor: 'Casais e cultura' },
    { name: 'Las Condes', vibe: 'Sofisticado', priceRange: '$$$', description: 'Bairro empresarial com shoppings, hotéis de rede e restaurantes.', bestFor: 'Negócios e compras' },
    { name: 'Bellavista', vibe: 'Animado', priceRange: '$', description: 'Vida noturna, restaurantes e casa-museu de Pablo Neruda.', bestFor: 'Jovens e vida noturna' },
  ],
  'Montevidéu': [
    { name: 'Pocitos', vibe: 'Residencial', priceRange: '$$', description: 'Bairro de praia com rambla, cafés e ritmo local agradável.', bestFor: 'Famílias e casais' },
    { name: 'Ciudad Vieja', vibe: 'Histórico', priceRange: '$', description: 'Centro antigo com Mercado del Puerto, teatros e museus.', bestFor: 'Cultura (só de dia)' },
    { name: 'Punta Carretas', vibe: 'Sofisticado', priceRange: '$$$', description: 'Bairro nobre com shopping, praia e restaurantes refinados.', bestFor: 'Casais e compras' },
  ],
  'Cartagena': [
    { name: 'Cidade Murada (Centro)', vibe: 'Histórico', priceRange: '$$$', description: 'Casarões coloniais, restaurantes, boutiques dentro das muralhas.', bestFor: 'Casais e luxo' },
    { name: 'Getsemaní', vibe: 'Descolado', priceRange: '$', description: 'Bairro artístico fora da muralha com hostels, grafites e salsa.', bestFor: 'Mochileiros e jovens' },
    { name: 'Bocagrande', vibe: 'Resort', priceRange: '$$', description: 'Faixa de hotéis com praia, shoppings e vida noturna.', bestFor: 'Famílias' },
  ],
  'Lima': [
    { name: 'Miraflores', vibe: 'Seguro', priceRange: '$$', description: 'Bairro turístico principal com vista pro oceano, parques e restaurantes.', bestFor: 'Primeira viagem' },
    { name: 'Barranco', vibe: 'Boêmio', priceRange: '$$', description: 'Bairro artístico com bares, galerias e a Ponte dos Suspiros.', bestFor: 'Jovens e casais' },
    { name: 'San Isidro', vibe: 'Corporativo', priceRange: '$$$', description: 'Bairro nobre com hotéis de rede, parques e segurança.', bestFor: 'Negócios e luxo' },
  ],
  'Cusco': [
    { name: 'Plaza de Armas', vibe: 'Central', priceRange: '$$', description: 'Coração de Cusco com igrejas, restaurantes e base pra tudo.', bestFor: 'Primeira viagem' },
    { name: 'San Blas', vibe: 'Artístico', priceRange: '$$', description: 'Bairro de artesãos com ateliês, cafés e ruas íngremes charmosas.', bestFor: 'Casais e cultura' },
    { name: 'Pisac (Vale Sagrado)', vibe: 'Alternativo', priceRange: '$', description: 'Vila no vale com mercado dominical, ruínas e hostels tranquilos.', bestFor: 'Mochileiros' },
  ],
  'Bogotá': [
    { name: 'Zona G / Zona T', vibe: 'Sofisticado', priceRange: '$$$', description: 'Zona gastronômica e de compras com restaurantes premiados.', bestFor: 'Casais e gastronomia' },
    { name: 'La Candelaria', vibe: 'Histórico', priceRange: '$', description: 'Centro colonial com museus, grafites e hostels. Só de dia.', bestFor: 'Mochileiros e cultura' },
    { name: 'Usaquén', vibe: 'Charmoso', priceRange: '$$', description: 'Bairro residencial com feira dominical, restaurantes e segurança.', bestFor: 'Famílias e casais' },
    { name: 'Chapinero', vibe: 'Moderno', priceRange: '$$', description: 'Bairro jovem com cafés especiais, vida noturna e diversidade.', bestFor: 'Jovens' },
  ],
  'Bariloche': [
    { name: 'Centro Cívico', vibe: 'Prático', priceRange: '$$', description: 'Centro da cidade com chocolaterias, restaurantes e lojas na Calle Mitre.', bestFor: 'Todos' },
    { name: 'Llao Llao', vibe: 'Exclusivo', priceRange: '$$$', description: 'Região do hotel lendário com vistas espetaculares dos lagos.', bestFor: 'Lua de mel e luxo' },
    { name: 'Cerro Catedral', vibe: 'Esportivo', priceRange: '$$', description: 'Base da estação de esqui com alojamentos e restaurantes de montanha.', bestFor: 'Esquiadores' },
  ],

  // ===== AMÉRICA DO NORTE =====
  'Orlando': [
    { name: 'International Drive', vibe: 'Turístico', priceRange: '$$', description: 'Hotéis, restaurantes e atrações alinhados na I-Drive. Prático.', bestFor: 'Famílias e primeira viagem' },
    { name: 'Kissimmee', vibe: 'Econômico', priceRange: '$', description: 'Hotéis e casas de temporada baratas perto dos parques Disney.', bestFor: 'Famílias com orçamento' },
    { name: 'Lake Buena Vista', vibe: 'Disney', priceRange: '$$$', description: 'Hotéis dentro e ao redor do complexo Disney com transporte incluso.', bestFor: 'Imersão Disney' },
    { name: 'Universal Blvd', vibe: 'Prático', priceRange: '$$', description: 'Perto dos parques Universal, CityWalk pra jantar e vida noturna.', bestFor: 'Fãs de Universal' },
  ],
  'Nova York': [
    { name: 'Midtown Manhattan', vibe: 'Icônico', priceRange: '$$$', description: 'Times Square, Broadway, Empire State. Turístico mas central.', bestFor: 'Primeira viagem' },
    { name: 'Brooklyn (Williamsburg)', vibe: 'Descolado', priceRange: '$$', description: 'Bairro hipster com cervejarias, comida de rua e vista de Manhattan.', bestFor: 'Jovens e foodies' },
    { name: 'Lower East Side', vibe: 'Alternativo', priceRange: '$$', description: 'Vida noturna, bares escondidos e comida multicultural.', bestFor: 'Jovens e vida noturna' },
    { name: 'Upper West Side', vibe: 'Residencial', priceRange: '$$$', description: 'Perto do Central Park e museus, clima familiar e tranquilo.', bestFor: 'Famílias' },
  ],
  'Miami': [
    { name: 'South Beach', vibe: 'Animado', priceRange: '$$$', description: 'Art Deco, praia, vida noturna e restaurantes. O clássico de Miami.', bestFor: 'Jovens e casais' },
    { name: 'Wynwood', vibe: 'Artístico', priceRange: '$$', description: 'Grafites, galerias, cervejarias e restaurantes descolados.', bestFor: 'Foodies e cultura' },
    { name: 'Brickell', vibe: 'Moderno', priceRange: '$$$', description: 'Área financeira com rooftops, restaurantes e shopping Brickell City Centre.', bestFor: 'Negócios e casais' },
    { name: 'Coconut Grove', vibe: 'Tranquilo', priceRange: '$$', description: 'Bairro arborizado e residencial com cafés e marinas.', bestFor: 'Famílias' },
  ],
  'Los Angeles': [
    { name: 'Santa Monica', vibe: 'Praia', priceRange: '$$$', description: 'Pier icônico, Third Street Promenade, praia e bicicleta.', bestFor: 'Famílias e casais' },
    { name: 'Hollywood', vibe: 'Turístico', priceRange: '$$', description: 'Walk of Fame, Griffith Observatory, vida noturna movimentada.', bestFor: 'Primeira viagem' },
    { name: 'Venice Beach', vibe: 'Alternativo', priceRange: '$$', description: 'Boardwalk eclético, skatepark, Muscle Beach e canais.', bestFor: 'Jovens e mochileiros' },
    { name: 'Beverly Hills', vibe: 'Luxuoso', priceRange: '$$$', description: 'Rodeo Drive, mansões e restaurantes estrelados.', bestFor: 'Compras e luxo' },
  ],
  'Cancún': [
    { name: 'Zona Hoteleira', vibe: 'Resort', priceRange: '$$$', description: 'Faixa de resorts all-inclusive com praia caribenha e baladas.', bestFor: 'Casais e festas' },
    { name: 'Centro de Cancún', vibe: 'Local', priceRange: '$', description: 'Onde os locais vivem — comida autêntica e preços reais.', bestFor: 'Mochileiros e economia' },
    { name: 'Playa del Carmen', vibe: 'Boêmio', priceRange: '$$', description: 'Quinta Avenida com lojas, restaurantes e acesso a Cozumel.', bestFor: 'Casais e jovens' },
  ],
  'Toronto': [
    { name: 'Downtown / Entertainment District', vibe: 'Central', priceRange: '$$$', description: 'CN Tower, Rogers Centre, teatros e restaurantes. Hub de tudo.', bestFor: 'Primeira viagem' },
    { name: 'Kensington Market', vibe: 'Alternativo', priceRange: '$', description: 'Bairro multicultural com lojas vintage e comida do mundo todo.', bestFor: 'Mochileiros e foodies' },
    { name: 'Yorkville', vibe: 'Sofisticado', priceRange: '$$$', description: 'Bairro chique com galerias, lojas de grife e hotéis luxuosos.', bestFor: 'Casais e compras' },
    { name: 'Queen West', vibe: 'Descolado', priceRange: '$$', description: 'Arte de rua, lojas independentes e vida noturna diversificada.', bestFor: 'Jovens e artistas' },
  ],
  'Vancouver': [
    { name: 'Downtown / West End', vibe: 'Central', priceRange: '$$$', description: 'Perto de Stanley Park, praias e Robson Street pra compras.', bestFor: 'Primeira viagem' },
    { name: 'Gastown', vibe: 'Histórico', priceRange: '$$', description: 'Bairro mais antigo com restaurantes, bares e o Steam Clock.', bestFor: 'Casais e foodies' },
    { name: 'Kitsilano', vibe: 'Descontraído', priceRange: '$$', description: 'Praias, cafés, yoga e vibe saudável. Kits Beach é linda.', bestFor: 'Famílias e casais' },
    { name: 'Commercial Drive', vibe: 'Alternativo', priceRange: '$', description: 'Bairro multicultural com cafés italianos e comida internacional.', bestFor: 'Mochileiros e foodies' },
  ],

  // ===== EUROPA =====
  'Lisboa': [
    { name: 'Alfama', vibe: 'Tradicional', priceRange: '€', description: 'Bairro mais antigo com fado, vielas estreitas e miradouros.', bestFor: 'Casais e cultura' },
    { name: 'Baixa-Chiado', vibe: 'Central', priceRange: '€€', description: 'Centro da cidade com lojas, restaurantes e acesso fácil a tudo.', bestFor: 'Primeira viagem' },
    { name: 'Bairro Alto', vibe: 'Boêmio', priceRange: '€', description: 'Vida noturna mais animada de Lisboa com bares e fado.', bestFor: 'Jovens e vida noturna' },
    { name: 'Príncipe Real', vibe: 'Moderno', priceRange: '€€€', description: 'Bairro descolado com brunch, lojas de design e jardim panorâmico.', bestFor: 'Casais sofisticados' },
  ],
  'Porto': [
    { name: 'Ribeira', vibe: 'Histórico', priceRange: '€€', description: 'À beira do Douro, Patrimônio UNESCO, restaurantes com vista.', bestFor: 'Casais e fotos' },
    { name: 'Cedofeita', vibe: 'Descolado', priceRange: '€', description: 'Galerias, cafés especiais e lojas independentes.', bestFor: 'Jovens e artistas' },
    { name: 'Vila Nova de Gaia', vibe: 'Vinícola', priceRange: '€€', description: 'Caves de vinho do Porto, rooftop bars e teleférico com vista.', bestFor: 'Casais e gastronomia' },
    { name: 'Foz do Douro', vibe: 'Costeiro', priceRange: '€€', description: 'Onde o rio encontra o mar, praias e passeio na foz.', bestFor: 'Famílias' },
  ],
  'Paris': [
    { name: 'Le Marais (3e/4e)', vibe: 'Descolado', priceRange: '€€€', description: 'Bairro judeu e LGBTQ+ com galerias, bares e falafel.', bestFor: 'Jovens e casais' },
    { name: 'Saint-Germain-des-Prés (6e)', vibe: 'Intelectual', priceRange: '€€€', description: 'Cafés de Sartre e Hemingway, livrarias e atmosfera literária.', bestFor: 'Casais e cultura' },
    { name: 'Montmartre (18e)', vibe: 'Artístico', priceRange: '€€', description: 'Sacré-Coeur, artistas de rua e bistrôs charmosos.', bestFor: 'Mochileiros e românticos' },
    { name: 'Latin Quarter (5e)', vibe: 'Estudantil', priceRange: '€', description: 'Universidade, restaurantes baratos e livrarias.', bestFor: 'Mochileiros e estudantes' },
  ],
  'Londres': [
    { name: 'South Bank', vibe: 'Cultural', priceRange: '£££', description: 'Tate Modern, London Eye, Borough Market à beira do Tâmisa.', bestFor: 'Cultura e casais' },
    { name: 'Covent Garden', vibe: 'Animado', priceRange: '£££', description: 'Artistas de rua, teatros, lojas e mercado coberto.', bestFor: 'Primeira viagem' },
    { name: 'Camden', vibe: 'Alternativo', priceRange: '£', description: 'Mercado eclético, punk rock, comida de rua e canais.', bestFor: 'Jovens e alternativos' },
    { name: 'Shoreditch', vibe: 'Descolado', priceRange: '££', description: 'Arte de rua, cafés especiais, vida noturna underground.', bestFor: 'Jovens e foodies' },
  ],
  'Barcelona': [
    { name: 'Bairro Gótico', vibe: 'Medieval', priceRange: '€€', description: 'Labirinto de ruelas medievais com pracinhas e tapas.', bestFor: 'Casais e cultura' },
    { name: 'El Born', vibe: 'Descolado', priceRange: '€€', description: 'Bares de tapas, boutiques e Museu Picasso.', bestFor: 'Jovens e foodies' },
    { name: 'Eixample', vibe: 'Elegante', priceRange: '€€€', description: 'Gaudí (Sagrada Família, Casa Batlló), restaurantes e hotéis de qualidade.', bestFor: 'Casais e arquitetura' },
    { name: 'Barceloneta', vibe: 'Praia', priceRange: '€', description: 'Praia, chiringuitos, paella e vibe descontraída.', bestFor: 'Mochileiros e verão' },
  ],
  'Roma': [
    { name: 'Trastevere', vibe: 'Boêmio', priceRange: '€€', description: 'Bairro mais charmoso pra jantar com ruas de paralelepípedos e ivy.', bestFor: 'Casais e gastronomia' },
    { name: 'Monti', vibe: 'Descolado', priceRange: '€€', description: 'Bairro moderno perto do Coliseu com vintage, bares e artesanato.', bestFor: 'Jovens e casais' },
    { name: 'Centro Storico', vibe: 'Clássico', priceRange: '€€€', description: 'Panteão, Piazza Navona, Trevi — tudo a pé mas preços turísticos.', bestFor: 'Primeira viagem' },
    { name: 'Testaccio', vibe: 'Autêntico', priceRange: '€', description: 'Bairro romano de verdade. Melhor comida local, mercado e zero turista.', bestFor: 'Foodies' },
  ],
  'Madri': [
    { name: 'Malasaña', vibe: 'Descolado', priceRange: '€', description: 'Bairro alternativo com lojas vintage, bares e brunch.', bestFor: 'Jovens' },
    { name: 'La Latina', vibe: 'Tradicional', priceRange: '€', description: 'Tapas na Cava Baja, El Rastro no domingo e atmosfera local.', bestFor: 'Foodies e cultura' },
    { name: 'Chueca', vibe: 'Vibrante', priceRange: '€€', description: 'Bairro LGBTQ+, lojas de design, restaurantes e vida noturna.', bestFor: 'Jovens e casais' },
    { name: 'Salamanca', vibe: 'Elegante', priceRange: '€€€', description: 'Bairro nobre com lojas de grife, restaurantes estrelados e museus.', bestFor: 'Compras e luxo' },
  ],
  'Amsterdam': [
    { name: 'Jordaan', vibe: 'Charmoso', priceRange: '€€€', description: 'Canais, cafés brown, lojas vintage e mercados. O bairro mais lindo.', bestFor: 'Casais' },
    { name: 'De Pijp', vibe: 'Multicultural', priceRange: '€€', description: 'Albert Cuyp Market, comida do mundo e bares animados.', bestFor: 'Foodies e jovens' },
    { name: 'Oud-West', vibe: 'Local', priceRange: '€€', description: 'Bairro residencial com Foodhallen, parques e menos turistas.', bestFor: 'Locais experience' },
    { name: 'Centrum', vibe: 'Central', priceRange: '€€€', description: 'Dam Square, Red Light District, estação central. Turístico mas prático.', bestFor: 'Primeira viagem' },
  ],
  'Berlim': [
    { name: 'Kreuzberg', vibe: 'Multicultural', priceRange: '€', description: 'Bairro turco, comida de rua, bares underground e vida noturna.', bestFor: 'Jovens e mochileiros' },
    { name: 'Mitte', vibe: 'Central', priceRange: '€€€', description: 'Museus, Portão de Brandemburgo, lojas e restaurantes.', bestFor: 'Primeira viagem' },
    { name: 'Friedrichshain', vibe: 'Alternativo', priceRange: '€', description: 'East Side Gallery, clubs lendários e vibe jovem.', bestFor: 'Vida noturna' },
    { name: 'Prenzlauer Berg', vibe: 'Familiar', priceRange: '€€', description: 'Cafés, brunch, parques e atmosfera residencial bonita.', bestFor: 'Famílias e casais' },
  ],
  'Praga': [
    { name: 'Staré Město (Cidade Velha)', vibe: 'Histórico', priceRange: '€€€', description: 'Relógio Astronômico, praça central, igrejas — turístico mas essencial.', bestFor: 'Primeira viagem' },
    { name: 'Vinohrady', vibe: 'Elegante', priceRange: '€€', description: 'Bairro residencial com cafés, parques e menos turistas.', bestFor: 'Casais e locais' },
    { name: 'Žižkov', vibe: 'Alternativo', priceRange: '€', description: 'Bairro boêmio com mais bares per capita do mundo. Cerveja baratíssima.', bestFor: 'Mochileiros e vida noturna' },
  ],
  'Viena': [
    { name: 'Innere Stadt (1° distrito)', vibe: 'Imperial', priceRange: '€€€', description: 'Stephansdom, Hofburg, ópera — coração histórico e luxuoso.', bestFor: 'Primeira viagem e casais' },
    { name: 'Neubau (7° distrito)', vibe: 'Descolado', priceRange: '€€', description: 'Lojas de design, cafés especiais e museu MuseumsQuartier perto.', bestFor: 'Jovens e artistas' },
    { name: 'Leopoldstadt (2° distrito)', vibe: 'Emergente', priceRange: '€', description: 'Prater (roda-gigante), Danúbio e bairro em renovação.', bestFor: 'Famílias e economia' },
  ],
  'Dublin': [
    { name: 'Temple Bar', vibe: 'Animado', priceRange: '€€€', description: 'Área de pubs mais famosa com música ao vivo toda noite.', bestFor: 'Vida noturna' },
    { name: 'Portobello', vibe: 'Descolado', priceRange: '€€', description: 'Bairro residencial com canal, cafés e restaurantes sem turistas.', bestFor: 'Casais e locais' },
    { name: 'Smithfield', vibe: 'Emergente', priceRange: '€', description: 'Destilaria Jameson, mercados e bairro em transformação.', bestFor: 'Mochileiros e foodies' },
  ],

  // ===== ÁSIA =====
  'Tóquio': [
    { name: 'Shinjuku', vibe: 'Intenso', priceRange: '¥¥', description: 'Arranha-céus, vida noturna em Golden Gai, e a maior estação do mundo.', bestFor: 'Jovens e vida noturna' },
    { name: 'Shibuya', vibe: 'Jovem', priceRange: '¥¥', description: 'Cruzamento famoso, moda, música e cultura pop japonesa.', bestFor: 'Jovens e cultura pop' },
    { name: 'Asakusa', vibe: 'Tradicional', priceRange: '¥', description: 'Senso-ji, ruas tradicionais, ryokans e Tóquio antiga.', bestFor: 'Cultura e famílias' },
    { name: 'Roppongi', vibe: 'Cosmopolita', priceRange: '¥¥¥', description: 'Arte (Mori Art Museum), vida noturna internacional e restaurantes.', bestFor: 'Casais e vida noturna' },
  ],
  'Bangkok': [
    { name: 'Sukhumvit', vibe: 'Moderno', priceRange: '฿฿', description: 'Hotéis, rooftops, restaurantes e BTS Skytrain. Base prática.', bestFor: 'Primeira viagem' },
    { name: 'Khao San Road', vibe: 'Mochileiro', priceRange: '฿', description: 'Rua mais famosa de mochileiros. Hostels, comida de rua e festa.', bestFor: 'Mochileiros e jovens' },
    { name: 'Silom', vibe: 'Corporativo', priceRange: '฿฿', description: 'Área financeira de dia, Patpong Night Market e bares de noite.', bestFor: 'Negócios e vida noturna' },
    { name: 'Riverside', vibe: 'Elegante', priceRange: '฿฿฿', description: 'Hotéis de luxo à beira do rio, templos e rooftops.', bestFor: 'Casais e luxo' },
  ],
  'Dubai': [
    { name: 'Downtown Dubai', vibe: 'Icônico', priceRange: 'AED AED AED', description: 'Burj Khalifa, Dubai Mall e fontes dançantes. Coração moderno.', bestFor: 'Primeira viagem' },
    { name: 'Dubai Marina', vibe: 'Moderno', priceRange: 'AED AED', description: 'Arranha-céus, praia JBR, restaurantes à beira-mar e marina walk.', bestFor: 'Casais e jovens' },
    { name: 'Deira', vibe: 'Tradicional', priceRange: 'AED', description: 'Dubai antigo com souks de ouro e especiarias, mais autêntico.', bestFor: 'Cultura e compras' },
    { name: 'Palm Jumeirah', vibe: 'Resort', priceRange: 'AED AED AED', description: 'Ilha artificial com resorts de luxo, praias privadas e restaurantes.', bestFor: 'Luxo e lua de mel' },
  ],

  // ===== OCEANIA =====
  'Sydney': [
    { name: 'Circular Quay / The Rocks', vibe: 'Icônico', priceRange: '$$$', description: 'Opera House, Harbour Bridge, ferries e bares históricos.', bestFor: 'Primeira viagem' },
    { name: 'Bondi', vibe: 'Praia', priceRange: '$$', description: 'Praia icônica, cafés de brunch, vida saudável e Bondi to Coogee walk.', bestFor: 'Jovens e casais' },
    { name: 'Surry Hills', vibe: 'Descolado', priceRange: '$$', description: 'Cafés especiais, restaurantes premiados e lojas independentes.', bestFor: 'Foodies e jovens' },
    { name: 'Manly', vibe: 'Praia', priceRange: '$$', description: 'Ferry de 30min de Circular Quay, praia e vibe de surfe.', bestFor: 'Famílias e surfistas' },
  ],
};
