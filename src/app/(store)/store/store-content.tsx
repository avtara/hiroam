import { StoreHero } from "@/components/store/store-hero";
import { AllDestinationsSection } from "@/components/store/all-destinations-section";
import { CTASection } from "@/components/landing/cta-section";
import { PopularDestinationsSection } from "@/components/store/popular-destinations-section";
import { BorderedContainer } from "@/components/bordered-container";
import { FAQSection } from "@/components/landing/faq-section";

export function StoreContent() {
  return (
    <div className="flex flex-col w-full gap-12 -mt-24">
      <div>
        <div className="bg-primary rounded-0 m-0 lg:rounded-4xl lg:m-4 p-4 pt-32 h-[320px]" />

        <div className="container mx-auto max-w-6xl -mt-48">
          <BorderedContainer
            className="bg-transparent container mx-auto"
            innerClassName="bg-muted"
          >
            <StoreHero
              bannerImages={[
                "https://images.unsplash.com/photo-1494253109108-2e30c049369b?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cmFuZG9tfGVufDB8fDB8fHww",
              ]}
            />

            <div className="mt-8">
              <PopularDestinationsSection
                innerClassName="bg-transparent"
                borderClassName="border-0 bg-transparent -mx-1"
                disableGlobal
                disableRegions
                centerHeader
              />
            </div>
          </BorderedContainer>
        </div>
      </div>

      <div className="flex flex-col gap-12 container max-w-6xl mx-auto px-4">
        <AllDestinationsSection />
        <FAQSection />
      </div>
      <CTASection className="translate-y-4" />
    </div>
  );
}
