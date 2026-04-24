// Статический каркас промта. Плейсхолдеры {{SLOT}} заменяются сборщиком.

window.PROMPT_SKELETON = `TASK:
Create a photorealistic fashion marketplace image using the provided garment reference photos.

INPUT:
- Images 1–3: photos of the SAME garment/product from different angles.
- The garment may be shown on a person, mannequin, hanger, or flat lay.

MODEL TYPE:
- {{MODEL_TYPE}}

PRODUCT:
- {{PRODUCT}}

GOAL:
Generate a realistic commercial fashion image where a naturally looking model wears the exact garment from the reference images.

The uploaded photos must be treated as product reference only, NOT as identity reference.

IMPORTANT MODEL INSTRUCTION:
- Do NOT copy, reconstruct, or preserve the identity, face, body, pose, hairstyle, or proportions of any person visible in the reference images.
- If the garment is shown on a human in the uploaded photos, use that person only as a clothing carrier reference.
- Create a new, neutral, realistic fashion model suitable for a marketplace campaign.

GARMENT PRESERVATION RULES:
The garment is the product being sold and must remain EXACTLY the same as in the reference images.

Do NOT redesign, restyle, simplify, or reinterpret the product in any way.

PRESERVE ALL GARMENT DETAILS EXACTLY:
- garment type and overall silhouette
- fit and proportions
- color and color balance
- fabric texture and material appearance
- seams and stitching
- folds and drape behavior
- waistband, cuffs, hems, collars, sleeves, pockets
- buttons, zippers, buckles, drawstrings and other hardware
- logos, labels, patches, embroidery, graphics and prints
- trims, piping, edges and finishing details

If some parts are visible only in certain angles, use all uploaded images together to reconstruct the most accurate final product appearance.

{{SCENE_DESCRIPTION_BLOCK}}
{{LOCATION_BLOCK}}
EXTRA STYLING RULE:
The AI may add missing outfit elements only when necessary to create a complete and realistic look.

Any added items must be:
- minimal
- neutral
- unbranded
- non-distracting

Restrictions:
- no visible logos
- no text
- no branded hardware
- no monograms
- no signature patterns
- no large graphics

All additions must serve only as supportive styling, while the main garment remains fully visible and dominant in the image.

SCENE INTEGRATION:
The model must look fully native to the scene, not pasted in.

Match and recalculate:
- lighting direction
- light softness or hardness
- exposure
- color temperature
- reflections
- perspective
- depth of field
- contact with surfaces and surrounding objects

SHADOWS:
Generate realistic shadows and grounding:
- contact shadows under feet/body
- correct shadow direction
- natural light interaction with the environment
- realistic depth and dimensionality

REALISM REQUIREMENT:
The final result must look like a real professional fashion photograph shot with a real camera.

Requirements:
- ultra-photorealistic skin
- realistic fabric and folds
- natural lighting
- no CGI look
- no plastic skin
- no over-smoothing
- no fake anatomy
- no artificial fabric behavior

STYLE:
- high-end commercial fashion photography
- marketplace-ready image
- editorial quality
- natural proportions
- real camera optics
- clean composition
- premium visual presentation
- ultra-photorealistic
- {{FRAMING}}
- aspect ratio {{ASPECT_RATIO}}

NEGATIVE PROMPT:
- copying the original model identity
- same face as reference person
- preserving the person from the source images
- altered garment design
- wrong fit
- changed length
- changed color
- modified fabric
- missing details
- simplified seams
- missing hardware
- removed logos
- inaccurate prints
- unrealistic folds
- poor draping
- floating body
- pasted subject
- bad perspective
- incorrect shadows
- over-smoothed skin
- CGI
- 3D render look
- cartoon style
- distorted anatomy
- extra limbs
- blurry image
- low resolution
- artifacts

FINAL PRIORITY:
1. Preserve the garment exactly as uploaded.
2. Do not preserve the identity of the original person from the reference photos.
3. Make the final image look like a real premium marketplace fashion photoshoot.`;
