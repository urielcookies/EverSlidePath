import type { OsdImageSource } from '../server/slideMetadata'

const S3 = 'https://openslide-demo-site.s3.dualstack.us-east-2.amazonaws.com'

export interface LibrarySlide {
  id: string
  name: string
  scanner: string
  stain: string
  mpp: number
  width: number
  height: number
  source: OsdImageSource
}

export const LIBRARY_SLIDES: LibrarySlide[] = [
  {
    id: 'lib-aperio-cmu1',
    name: 'CMU-1 (Aperio)',
    scanner: 'Aperio SVS',
    stain: 'H&E',
    mpp: 0.499,
    width: 46000,
    height: 32893,
    source: { Image: { Url: `${S3}/aperio/cmu-1/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 46000, Height: 32893 } } },
  },
  {
    id: 'lib-aperio-cmu2',
    name: 'CMU-2 (Aperio)',
    scanner: 'Aperio SVS',
    stain: 'H&E',
    mpp: 0.499,
    width: 33264,
    height: 47736,
    source: { Image: { Url: `${S3}/aperio/cmu-2/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 33264, Height: 47736 } } },
  },
  {
    id: 'lib-aperio-cmu3',
    name: 'CMU-3 (Aperio)',
    scanner: 'Aperio SVS',
    stain: 'H&E',
    mpp: 0.499,
    width: 42240,
    height: 62160,
    source: { Image: { Url: `${S3}/aperio/cmu-3/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 42240, Height: 62160 } } },
  },
  {
    id: 'lib-hamamatsu-os1',
    name: 'OS-1 (Hamamatsu)',
    scanner: 'Hamamatsu NDPI',
    stain: 'H&E',
    mpp: 0.228,
    width: 85184,
    height: 68928,
    source: { Image: { Url: `${S3}/hamamatsu/os-1/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 85184, Height: 68928 } } },
  },
  {
    id: 'lib-hamamatsu-os2',
    name: 'OS-2 (Hamamatsu)',
    scanner: 'Hamamatsu NDPI',
    stain: 'H&E',
    mpp: 0.228,
    width: 68864,
    height: 92928,
    source: { Image: { Url: `${S3}/hamamatsu/os-2/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 68864, Height: 92928 } } },
  },
  {
    id: 'lib-philips-1',
    name: 'Philips-1',
    scanner: 'Philips TIFF',
    stain: 'H&E',
    mpp: 0.25,
    width: 101400,
    height: 83200,
    source: { Image: { Url: `${S3}/philips-tiff/philips-1/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 101400, Height: 83200 } } },
  },
  {
    id: 'lib-mirax-fluoro1',
    name: 'Fluorescence-1 (MIRAX)',
    scanner: 'MIRAX',
    stain: 'Fluorescence',
    mpp: 0.161,
    width: 46920,
    height: 33014,
    source: { Image: { Url: `${S3}/mirax/Mirax2-Fluorescence-1/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 46920, Height: 33014 } } },
  },
  {
    id: 'lib-mirax-fluoro2',
    name: 'Fluorescence-2 (MIRAX)',
    scanner: 'MIRAX',
    stain: 'Fluorescence',
    mpp: 0.161,
    width: 46920,
    height: 33014,
    source: { Image: { Url: `${S3}/mirax/Mirax2-Fluorescence-2/slide_files/`, Format: 'jpeg', TileSize: 510, Overlap: 1, Size: { Width: 46920, Height: 33014 } } },
  },
]
