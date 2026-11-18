import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Sobre, termos e privacidade",
  description: "O que é o INHACA CONNECT, termos de utilização e política de privacidade.",
};

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <PageHeader eyebrow="INHACA CONNECT" title="Sobre a plataforma" />
      <div className="space-y-10 leading-relaxed">
        <section>
          <p>
            O INHACA CONNECT é uma plataforma digital dedicada à Ilha de Inhaca, em Moçambique. Reúne informação turística,
            um diretório de negócios locais, um mapa interativo, a agenda de acontecimentos, um mercado local e espaços de
            comunicação para habitantes, visitantes e prestadores de serviços.
          </p>
          <p className="mt-3">
            Qualquer pessoa pode consultar os conteúdos públicos sem criar conta. A conta é necessária para publicar,
            comentar, enviar mensagens e gerir negócios, produtos ou eventos.
          </p>
        </section>

        <section id="termos">
          <h2 className="text-2xl font-bold text-ocean">Termos de utilização</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>É responsável pelos conteúdos que publica e pela veracidade das informações sobre o seu negócio, produtos e eventos.</li>
            <li>Não é permitido publicar conteúdos ofensivos, discriminatórios, enganosos, ilegais ou que violem direitos de terceiros.</li>
            <li>Só pode publicar fotografias de que seja autor ou que tenha autorização para usar. Não apresente imagens de outros locais como sendo da Inhaca.</li>
            <li>Estabelecimentos e eventos são publicados após aprovação administrativa. A administração pode recusar, suspender ou remover conteúdos.</li>
            <li>O mercado local é um espaço de divulgação: as transações, pagamentos e entregas são combinados diretamente entre as partes, sem intervenção da plataforma.</li>
            <li>Contas que violem estes termos podem ser suspensas.</li>
          </ol>
        </section>

        <section id="privacidade">
          <h2 className="text-2xl font-bold text-ocean">Política de privacidade</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Recolhemos apenas os dados necessários: email, nome, nome de utilizador e os dados que decidir acrescentar ao seu perfil.</li>
            <li>O seu email não é mostrado publicamente. Os contactos telefónicos só aparecem se os indicar num perfil, negócio, produto ou pedido.</li>
            <li>As mensagens privadas só são acessíveis aos participantes da conversa. A moderação pode aceder a conteúdos denunciados para os analisar.</li>
            <li>A localização do seu dispositivo só é usada no mapa quando a autoriza, e não é guardada.</li>
            <li>Pode editar o seu perfil a qualquer momento e pedir a eliminação da conta através dos contactos da administração.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-ocean">Créditos</h2>
          <p className="mt-3">
            Dados cartográficos ©{" "}
            <a className="text-turquoise underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              contribuidores OpenStreetMap
            </a>
            . Mapa vetorial servido por OpenFreeMap e renderizado com MapLibre GL JS.
          </p>
        </section>
      </div>
    </div>
  );
}
