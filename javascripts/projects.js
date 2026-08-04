/* ------------------------------------------------------------------
   Curated work set (v2). One source of truth for every variation.

   - Home grid filters out horizon-chat (shown inside Quest case study).
   - `orientation` lets the grid place portrait phone clips in tall
     frames and landscape device clips in wide frames, so nothing gets
     upscaled into a blurry full-bleed.
   - `detail` drives BOTH the standalone project page and the in-page
     overlay reader (no duplicate content, no extra click).
------------------------------------------------------------------ */
window.PROJECTS = [
  {
    id: "quest-people",
    title: "Social VR",
    product: "Quest",
    era: "Meta",
    orientation: "landscape",
    hover: "depth",
    overlay: "split",
    tile: { type: "video", src: "/images/quest-vr/people-tab.mp4", fit: "cover", insetShadow: true },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "Quests are the best-selling VR devices ever. My focus was helping people communicate and play together in VR. As part of a broader redesign of the VR OS in 2024, we created the Navigator: a single menu accessible from anywhere for apps, social, and settings. I developed the initial direction for the You and People tabs before handing off to senior designers to bring the experience across the finish line.",
      meta: [
        { k: "Project", brand: "meta", v: "Quest" },
        { k: "Role", v: "Product Designer" },
        { k: "Platforms", v: "VR OS" },
        { k: "Date", v: "2024–2025" },
      ],
      sections: [
        {
          title: "Navigator",
          intro:
            "Quests are the best-selling VR devices ever. My focus was helping people communicate and play together in VR. As part of a broader redesign of the VR OS in 2024, we created the Navigator: a single menu accessible from anywhere for apps, social, and settings. I developed the initial direction for the You and People tabs before handing off to senior designers to bring the experience across the finish line.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/quest-vr/people-tab-loop.mp4",
                  alt: "Quest Navigator People tab with friends in VR",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/quest-vr/you-tab-loop.mp4",
                  alt: "Quest Navigator You tab with avatar and profile",
                  fit: "cover",
                },
              ],
            },
          ],
          body: [
            "This required coordinating across multiple teams to bring in their highest value features. The challenge was integrating complex systems without bloating the feature set.",
          ],
        },
        {
          title: "Joinable Status",
          intro:
            "I shipped joinable status and redesigned the social privacy settings **resulting in a 300% increase in people joining their friend's games.**",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/quest-vr/joinable-status.jpg",
                  fill: "#76606c",
                  alt: "Joinable status dropdown in the Quest People menu",
                  fit: "cover",
                },
              ],
              caption:
                "Previously, active status was a confusing mix of toggles to share your online status and current app. I simplified to a single dropdown: Joinable, online, and offline.",
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/quest-vr/active-status-changes.png",
                  fill: "#202e3a",
                  alt: "Active Status and Rich Presence toggles mapped to Joinable, Online, and Appear offline",
                  fit: "cover",
                },
                {
                  type: "image",
                  src: "/images/quest-vr/active-status-migration.png",
                  fill: "#716d66",
                  alt: "Profiles now control who sees your activity migration notice",
                  fit: "cover",
                },
              ],
            },
          ],
          body: [
            "Previously, active status was a confusing mix of toggles to share your online status and current app. I simplified to a single dropdown: Joinable, online, and offline.",
            "The simplified social privacy settings required a migration of existing settings, which I carefully designed to minimize disruption. The result was no measurable impact to retention or engagement.",
          ],
        },
        {
          title: "In-game Communication",
          intro:
            "Horizon is Meta's social platform for VR. I led a small team to redesign in-world communication across text chat, voice, and emotes, including the in-game menu experience. This work was completed for both VR and Mobile.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/home/World-Comms.tile.mp4",
                  alt: "Horizon world chat on mobile",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/horizon/emotes-menu-vr.jpg",
                  fill: "#73858c",
                  alt: "Emotes menu in Horizon VR",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/horizon/vr-concept-prototype.mp4",
                  alt: "VR concept prototype for in-world communication",
                  fit: "cover",
                  label: "Concept prototype",
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    id: "horizon-chat",
    title: "In-game Communication",
    product: "Horizon",
    era: "Meta",
    orientation: "landscape",
    feature: true,
    hover: "sweep",
    overlay: "dock",
    tile: { type: "video", src: "/images/home/World-Comms.tile.mp4", fit: "cover" },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede: [
        "Horizon is Meta's social platform for VR. I led a small team to redesign in-world communication across text chat, voice, and emotes, including the in-game menu experience.",
        "Communication in VR has to work while people are moving, playing, and present with others. We rebuilt text chat from the ground up and made it the calm default modality.",
      ],
      meta: [
        { k: "Project", brand: "meta", v: "Horizon" },
        { k: "Role", v: "Design lead, guiding 3 designers" },
        { k: "Platforms", v: "Mobile & VR" },
        { k: "Date", v: "2025–2026" },
      ],
      sections: [
        {
          title: "Voice → Text",
          intro: [
            "Horizon is Meta's social platform for VR. I led a small team to redesign in-world communication across text chat, voice, and emotes, including the in-game menu experience.",
            "Communication in VR has to work while people are moving, playing, and present with others. We rebuilt text chat from the ground up and made it the calm default modality.",
          ],
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/home/World-Comms.tile.mp4",
                  alt: "Horizon world chat on mobile",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/horizon/emotes-menu-vr.jpg",
                  fill: "#73858c",
                  alt: "Emotes menu in Horizon VR",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/horizon/vr-concept-prototype.mp4",
                  alt: "VR concept prototype for in-world communication",
                  fit: "cover",
                  label: "Concept prototype",
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    id: "horizon-mobile",
    title: "Gaming Profiles across Meta",
    product: "Horizon",
    era: "Meta",
    orientation: "portrait",
    hover: "drift",
    overlay: "split",
    tile: { type: "video", src: "/images/home/Gaming-Profile.tile.mp4", fit: "cover" },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "As Horizon expanded across Facebook and Instagram, we needed to define how gaming profiles and networks would work across Meta. I led a cross-org design sprint across Facebook, Instagram, Horizon, and Central Product, and aligned directors and VPs on a single direction.",
      intro:
        "As Horizon expanded across Facebook and Instagram, we needed to define how gaming profiles and networks would work across Meta. I led a cross-org design sprint across Facebook, Instagram, Horizon, and Central Product, and aligned directors and VPs on a single direction.",
      meta: [
        { k: "Project", brand: "meta", v: "Horizon" },
        { k: "Role", v: "Design lead, guiding 5 designers" },
        { k: "Platforms", v: "Mobile" },
        { k: "Date", v: "2026" },
      ],
      sections: [
        {
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/horizon/Gaming-Profile-hero-image.mp4",
                  alt: "Horizon mobile app showing gaming profiles and friends activity",
                  fit: "contain",
                },
              ],
            },
          ],
        },
      ],
      footnote: {
        lead: "This work is scheduled to ship in Summer 2026.",
        body:
          "I can share the full case study during a portfolio review, including how we defined a shared gaming profile across Meta, aligned directors and VPs across four orgs, and designed the foundations for gaming profiles across Facebook and Instagram.",
      },
    },
  },

  {
    id: "portal-voice",
    title: "Facebook on Portal",
    product: "Portal",
    era: "Meta",
    orientation: "portrait",
    hover: "bloom",
    overlay: "split",
    tile: { type: "video", src: "/images/home/FB-Watch.tile.mp4", fit: "cover" },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "Portal owners loved making video calls and the ease of hands-free calling with Smart Camera — the AI-powered camera that kept everyone on screen. We wanted to bring that magic to more experiences, like going live on Facebook.",
      meta: [
        { k: "Project", brand: "meta", v: "Portal" },
        { k: "Role", v: "Product Designer" },
        { k: "Platforms", v: "Portal & Portal TV" },
        { k: "Date", v: "2019–2020" },
      ],
      sections: [
        {
          title: "Facebook Live",
          intro:
            "Portal owners loved making video calls and the ease of hands-free calling with Smart Camera — the AI-powered camera that kept everyone on screen. We wanted to bring that magic to more experiences, like going live on Facebook.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Live-woman-on-portal.jpg",
                  fill: "#9fa19a",
                  alt: "Facebook Live on Portal with Smart Camera and live comments",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-loading-screen.jpg",
                  fill: "#293042",
                  alt: "Facebook Live splash screen on Portal",
                  fit: "cover",
                },
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-prototype.jpg",
                  fill: "#342f33",
                  alt: "Start Live Video setup on Portal",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Live-TV.jpg",
                  fill: "#4d3c38",
                  alt: "Facebook Live on Portal TV with audience comments",
                  fit: "cover",
                },
              ],
            },
          ],
          body: [
            "Launched in early 2020, we immediately saw people using it to reach their audiences while sheltering in place. People were using Portals to broadcast sermons, share thoughts on pandemic job loss, and provide FAQs on social distancing.",
          ],
        },
        {
          title: "Facebook Watch",
          intro:
            "In addition to video calls and going live, people used their Portals to consume media. I adapted Facebook Watch so people could easily watch their favorite shows and videos from creators.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/portal/facebook-on-portal/FB-Watch-video-chaining.mp4",
                  alt: "Facebook Watch on Portal playing Red Table Talk",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-tv-icon.jpg",
                  fill: "#25367a",
                  alt: "Facebook Watch app on Portal TV home screen",
                  fit: "cover",
                },
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-browse.jpg",
                  fill: "#2f2e32",
                  alt: "Facebook Watch browse experience on Portal",
                  fit: "cover",
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    id: "portal-household",
    title: "Household Mode",
    product: "Portal",
    era: "Meta",
    orientation: "landscape",
    feature: true,
    hover: "rise",
    overlay: "expand",
    tile: {
      type: "video",
      src: "/images/home/Householde-Mode.tile.mp4",
      fit: "cover",
      align: "top left"
    },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "Household mode let parents set limits for kids on a shared Portal — controlling who could be contacted and which apps were available.",
      meta: [
        { k: "Project", brand: "meta", v: "Portal" },
        { k: "Role", v: "Product Designer" },
        { k: "Platforms", v: "Portal & Portal TV" },
        { k: "Date", v: "2021" },
      ],
      sections: [
        {
          intro:
            "Household mode let parents set limits for kids on a shared Portal — controlling who could be contacted and which apps were available.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/portal/household-mode/household-mode-animation.mp4",
                  alt: "Household Mode profile switching on Portal",
                  fit: "cover",
                  overlay: {
                    src: "/images/portal/household-mode/household-mode-specs.png",
                    fill: "#0e0e10",
                    alt: "Household mode animation specifications",
                  },
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/household-mode/Household-Mode-label.jpg",
                  fill: "#b0a69e",
                  alt: "Household mode label on Portal home screen",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/portal/household-mode/Household-mode-is-on.mp4",
                  alt: "Household mode discovery on Portal",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/household-mode/Household-mode-discovery.jpg",
                  fill: "#677075",
                  alt: "Household mode promo and app restriction settings on Portal",
                  fit: "cover",
                },
              ],
            },
          ],
        },
        {
          title: "Meta Accounts",
          intro:
            "Alongside Household Mode, I redesigned Portal's account and login flows for the Meta Accounts launch. I partnered with the central team to evaluate platform requirements, and successfully advocated to reduce scope to better serve Portal's audience. Linking a Meta account and Facebook profile meant people could use one account to manage Household Mode.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/meta-accounts/Meta-accounts-across-devices.jpg",
                  fill: "#595458",
                  alt: "Meta Accounts setup across Portal, Quest, mobile, and desktop",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/meta-accounts/Meta-accounts-login.jpg",
                  fill: "#30343b",
                  alt: "Who's using Portal profile picker",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/portal/meta-accounts/accounts-center-tv.mp4",
                  alt: "Accounts Center on Portal TV",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/meta-accounts/Meta-accounts-setup-confirmation.jpg",
                  fill: "#869195",
                  alt: "Meta account added confirmation on Portal",
                  fit: "cover",
                },
              ],
            },
          ],
        },
      ],
    },
  },
];
